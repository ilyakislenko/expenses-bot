jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const FamilyService = require('../services/FamilyService');
const FamilyRepository = require('../repositories/FamilyRepository');
const CallbackHandlers = require('../handlers/callbacks');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const profileRefreshMiddleware = require('../middleware/profileRefreshMiddleware');

const OWNER = 1;
const MEMBER = 2;
const OUTSIDER = 3;
const OTHER_OWNER = 4;
const HOUR = 3600 * 1000;

const uniqueViolation = () => Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

// In-memory state behind the repositories; unique indexes behave like Postgres (23505)
function makeWorld({ users: extraUsers = [] } = {}) {
  const users = new Map([
    [OWNER, { id: OWNER, username: 'owner', first_name: 'Owner' }],
    [MEMBER, { id: MEMBER, username: 'member', first_name: 'Member' }],
    [OUTSIDER, { id: OUTSIDER, username: 'OutSider', first_name: 'Outsider' }],
    [OTHER_OWNER, { id: OTHER_OWNER, username: 'other', first_name: 'Other' }],
    ...extraUsers.map(u => [u.id, u])
  ]);
  const families = new Map([
    [1, { id: 1, name: 'Home', owner_id: OWNER }],
    [2, { id: 2, name: 'Other', owner_id: OTHER_OWNER }]
  ]);
  const members = new Map([[OWNER, 1], [MEMBER, 1], [OTHER_OWNER, 2]]);
  const invitations = new Map();
  let nextInvitationId = 1;

  const familyRepository = {
    getUserFamily: jest.fn(async (userId) => families.get(members.get(userId))),
    getFamilyById: jest.fn(async (id) => families.get(id)),
    isUserInFamily: jest.fn(async (userId, familyId) => members.get(userId) === familyId),
    getFamilyMembers: jest.fn(async (familyId) => [...members.entries()]
      .filter(([, fid]) => fid === familyId)
      .map(([uid]) => ({ ...users.get(uid), role: families.get(familyId).owner_id === uid ? 'owner' : 'member' }))),
    addMemberToFamily: jest.fn(async (familyId, userId) => {
      if (members.has(userId)) throw uniqueViolation();
      members.set(userId, familyId);
    }),
    removeMemberFromFamily: jest.fn(async (familyId, userId) => {
      if (members.get(userId) === familyId) members.delete(userId);
    })
  };

  const familyInvitationRepository = {
    createInvitation: jest.fn(async (familyId, inviterId, inviteeId) => {
      // idx_family_invitations_pending_unique: одно ожидающее приглашение на человека
      if ([...invitations.values()].some(i => Number(i.invitee_id) === inviteeId && i.status === 'pending')) {
        throw uniqueViolation();
      }
      const id = nextInvitationId++;
      const invitation = {
        id,
        family_id: familyId,
        inviter_id: String(inviterId),
        invitee_id: String(inviteeId),
        invite_code: `CODE${id}`,
        status: 'pending',
        expires_at_utc: new Date(Date.now() + 24 * HOUR).toISOString()
      };
      invitations.set(invitation.invite_code, invitation);
      return invitation;
    }),
    getInvitationByCode: jest.fn(async (code) => invitations.get(code)),
    hasPendingInvitation: jest.fn(async (inviteeId, familyId) => [...invitations.values()]
      .some(i => Number(i.invitee_id) === inviteeId && i.family_id === familyId
        && i.status === 'pending' && new Date(i.expires_at_utc) > new Date())),
    expireOldInvitations: jest.fn(async () => {
      for (const i of invitations.values()) {
        if (i.status === 'pending' && new Date(i.expires_at_utc) <= new Date()) i.status = 'expired';
      }
    }),
    updateInvitationStatusByCode: jest.fn(async (code, status) => { invitations.get(code).status = status; })
  };

  const userRepository = {
    getUserById: jest.fn(async (id) => users.get(Number(id))),
    findUsersByUsername: jest.fn(async (username) => [...users.values()]
      .filter(u => u.username && u.username.toLowerCase() === username.toLowerCase()))
  };

  // users.premium = true, но срок уже прошёл: настоящая проверка — по сроку
  const premiumService = { isPremiumUser: jest.fn(async (id) => id !== 99) };
  const notificationService = {
    sendFamilyInvitation: jest.fn(async () => {}),
    sendFamilyMemberRemoved: jest.fn(async () => {}),
    sendInvitationCancelled: jest.fn(async () => {})
  };

  const service = new FamilyService(familyRepository, familyInvitationRepository, userRepository, {}, notificationService, premiumService);
  return { service, users, families, members, invitations, userRepository, notificationService };
}

function addStaleInvitation(invitations, { familyId = 2, inviteeId = OUTSIDER, code = 'STALE001' } = {}) {
  invitations.set(code, {
    id: 100,
    family_id: familyId,
    inviter_id: String(OTHER_OWNER),
    invitee_id: String(inviteeId),
    invite_code: code,
    status: 'pending',
    expires_at_utc: new Date(Date.now() - HOUR).toISOString()
  });
}

describe('SEC-4: stale pending invitations', () => {
  test('a user with an ignored, expired invitation from another family can be invited again', async () => {
    const { service, invitations, notificationService } = makeWorld();
    addStaleInvitation(invitations);

    const { invitation } = await service.createInvitation(OWNER, 'outsider');

    expect(invitations.get('STALE001').status).toBe('expired');
    expect(invitations.get(invitation.invite_code)).toMatchObject({ family_id: 1, status: 'pending' });
    expect(notificationService.sendFamilyInvitation).toHaveBeenCalledWith(OUTSIDER, 'Home', 'owner', invitation.invite_code);
  });

  test('a live invitation from another family is reported as "already has an invitation", not a generic error', async () => {
    const { service, invitations } = makeWorld();
    await service.createInvitation(OTHER_OWNER, 'outsider');

    await expect(service.createInvitation(OWNER, 'outsider')).rejects.toThrow('User already has a pending invitation');
    expect([...invitations.values()].filter(i => i.status === 'pending')).toHaveLength(1);
  });

  test('accepting an expired invitation marks it expired, so the user can be invited again', async () => {
    const { service, invitations, members } = makeWorld();
    addStaleInvitation(invitations, { familyId: 1 });

    await expect(service.acceptInvitation(OUTSIDER, 'STALE001')).rejects.toThrow('Invitation has expired');
    expect(invitations.get('STALE001').status).toBe('expired');
    expect(members.has(OUTSIDER)).toBe(false);

    await expect(service.createInvitation(OWNER, 'outsider')).resolves.toBeDefined();
  });

  test('accepting while already in a family (unique family_user.user_id) is "already a member"', async () => {
    const { service, members, invitations } = makeWorld();
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    // Гонка: проверка getUserFamily прошла, а INSERT упёрся в уникальный индекс
    members.set(OUTSIDER, 2);
    const realGetUserFamily = service.familyRepository.getUserFamily;
    service.familyRepository.getUserFamily = jest.fn(async () => undefined);

    await expect(service.acceptInvitation(OUTSIDER, invitation.invite_code)).rejects.toThrow('User is already a member of a family');
    expect(members.get(OUTSIDER)).toBe(2);
    expect(invitations.get(invitation.invite_code).status).toBe('pending');
    service.familyRepository.getUserFamily = realGetUserFamily;
  });
});

describe('SEC-5 / Q4: username lookup', () => {
  test('username is matched case-insensitively', async () => {
    const { service } = makeWorld();
    const { invitee } = await service.createInvitation(OWNER, 'OUTSIDER');
    expect(invitee.id).toBe(OUTSIDER);
  });

  test('an ambiguous username is refused instead of inviting a random match', async () => {
    const { service, invitations, notificationService } = makeWorld({
      users: [{ id: 5, username: 'alex', first_name: 'A' }, { id: 6, username: 'Alex', first_name: 'B' }]
    });
    await expect(service.createInvitation(OWNER, 'alex')).rejects.toThrow('User not found');
    expect(invitations.size).toBe(0);
    expect(notificationService.sendFamilyInvitation).not.toHaveBeenCalled();
  });

  test('premium is checked by the real expiry, not by the users.premium flag', async () => {
    const { service, invitations } = makeWorld({ users: [{ id: 99, username: 'expired', first_name: 'E', premium: true }] });
    await expect(service.createInvitation(OWNER, 'expired')).rejects.toThrow('User does not have premium status');
    expect(invitations.size).toBe(0);
  });
});

describe('Q4: profile refresh middleware', () => {
  const ctxFrom = (from) => ({ from });

  test('writes username/first_name only when they change and always continues', async () => {
    const userRepository = { refreshProfile: jest.fn().mockResolvedValue() };
    const mw = profileRefreshMiddleware(userRepository);
    const next = jest.fn().mockResolvedValue();

    await mw(ctxFrom({ id: 7, username: 'alex', first_name: 'Alex' }), next);
    await mw(ctxFrom({ id: 7, username: 'alex', first_name: 'Alex' }), next);
    await mw(ctxFrom({ id: 7, username: 'alex2', first_name: 'Alex' }), next);
    await mw(ctxFrom({ id: 7, first_name: 'Alex' }), next);

    expect(userRepository.refreshProfile.mock.calls).toEqual([
      [7, 'alex', 'Alex'],
      [7, 'alex2', 'Alex'],
      [7, null, 'Alex']
    ]);
    expect(next).toHaveBeenCalledTimes(4);
  });

  test('a database error does not block the update and is retried next time', async () => {
    const userRepository = { refreshProfile: jest.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue() };
    const mw = profileRefreshMiddleware(userRepository);
    const next = jest.fn().mockResolvedValue();

    await mw(ctxFrom({ id: 8, username: 'bob', first_name: 'Bob' }), next);
    await mw(ctxFrom({ id: 8, username: 'bob', first_name: 'Bob' }), next);

    expect(userRepository.refreshProfile).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe('SEC-8: remove_member / confirm_remove_member', () => {
  let world;
  let handlers;
  let localizationService;
  let userService;
  const t = (key) => localizationService.getText('en', key);

  function callbackCtx(data) {
    return {
      from: { id: OWNER },
      callbackQuery: { data, message: { message_id: 1 } },
      reply: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCbQuery: jest.fn().mockResolvedValue(true)
    };
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // обработчики логируют ожидаемые отказы
    world = makeWorld();
    localizationService = new LocalizationService();
    userService = {
      getUserLanguage: jest.fn().mockResolvedValue('en'),
      getUserById: jest.fn(async (id) => world.users.get(Number(id)))
    };
    handlers = new CallbackHandlers({
      familyService: world.service,
      premiumService: { isPremiumUser: jest.fn().mockResolvedValue(true) },
      localizationService,
      formatter: new Formatter({}),
      userService
    });
  });

  afterEach(() => jest.restoreAllMocks());

  test('remove_member with the id of a user outside the family reveals nothing', async () => {
    const ctx = callbackCtx(`remove_member|${OUTSIDER}`);
    await handlers.handleRemoveMember(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(t('user_not_found'));
    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(userService.getUserById).not.toHaveBeenCalled();
  });

  test('confirm_remove_member of a non-member changes nothing', async () => {
    const ctx = callbackCtx(`confirm_remove_member|${OTHER_OWNER}`);
    await handlers.handleConfirmRemoveMember(ctx);

    expect(world.members.get(OTHER_OWNER)).toBe(2);
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(t('user_not_found'));
    expect(world.notificationService.sendFamilyMemberRemoved).not.toHaveBeenCalled();
  });

  test('the owner cannot remove themselves via a crafted callback (id arrives as a string)', async () => {
    for (const data of [`remove_member|${OWNER}`, `confirm_remove_member|${OWNER}`]) {
      const ctx = callbackCtx(data);
      await (data.startsWith('confirm') ? handlers.handleConfirmRemoveMember(ctx) : handlers.handleRemoveMember(ctx));
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(t('not_authorized'));
    }
    expect(world.members.get(OWNER)).toBe(1);
    await expect(world.service.removeMemberFromFamily(OWNER, String(OWNER))).rejects.toThrow('Cannot remove yourself from family');
    expect(world.members.get(OWNER)).toBe(1);
  });

  test('a real member is removed and notified (no unused removedBy argument)', async () => {
    const ctx = callbackCtx(`confirm_remove_member|${MEMBER}`);
    await handlers.handleConfirmRemoveMember(ctx);

    expect(world.members.has(MEMBER)).toBe(false);
    expect(world.notificationService.sendFamilyMemberRemoved).toHaveBeenCalledWith(MEMBER, 'Home');
    expect(ctx.editMessageText.mock.calls[0][0]).toContain('member');
  });
});

describe('Q2: leaving or being removed detaches the member\'s expenses', () => {
  // FamilyRepository against an in-memory database: only the statements it issues are emulated
  function repositoryWithDb() {
    const db = {
      families: [{ id: 1, name: 'Home', owner_id: OWNER }],
      familyUser: [{ family_id: 1, user_id: OWNER }, { family_id: 1, user_id: MEMBER }, { family_id: 2, user_id: OUTSIDER }],
      expenses: [
        { id: 1, user_id: MEMBER, family_id: 1 },
        { id: 2, user_id: MEMBER, family_id: null },
        { id: 3, user_id: OWNER, family_id: 1 },
        { id: 4, user_id: OUTSIDER, family_id: 2 }
      ]
    };
    const exec = async (sql, params) => {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('DELETE FROM family_user WHERE family_id = $1 AND user_id = $2')) {
        const removed = db.familyUser.filter(r => r.family_id === params[0] && r.user_id === params[1]);
        db.familyUser = db.familyUser.filter(r => !removed.includes(r));
        return { rows: removed, rowCount: removed.length };
      }
      if (s.startsWith('UPDATE expenses SET family_id = NULL WHERE family_id = $1 AND user_id = $2')) {
        const hit = db.expenses.filter(e => e.family_id === params[0] && e.user_id === params[1]);
        hit.forEach(e => { e.family_id = null; });
        return { rows: [], rowCount: hit.length };
      }
      if (s.includes('FROM families f JOIN family_user fu')) {
        const link = db.familyUser.find(r => r.user_id === params[0]);
        const family = link && db.families.find(f => f.id === link.family_id);
        return { rows: family ? [{ ...family }] : [] };
      }
      if (s.startsWith('SELECT COUNT(*) as count FROM family_user')) {
        const count = db.familyUser.filter(r => r.family_id === params[0] && r.user_id === params[1]).length;
        return { rows: [{ count: String(count) }] };
      }
      throw new Error(`Unexpected SQL in test: ${s}`);
    };
    const repository = new FamilyRepository();
    repository.query = jest.fn(exec);
    repository.transaction = jest.fn(async (callback) => callback({ query: exec }));
    return { repository, db };
  }

  const familyOf = (db, expenseId) => db.expenses.find(e => e.id === expenseId).family_id;

  test('a member who leaves takes their family expenses as personal; others keep theirs', async () => {
    const { repository, db } = repositoryWithDb();
    const service = new FamilyService(repository, {}, {}, {}, null, {});

    await service.leaveFamily(MEMBER);

    expect(db.familyUser.some(r => r.user_id === MEMBER)).toBe(false);
    expect(familyOf(db, 1)).toBeNull();
    expect(familyOf(db, 3)).toBe(1);
    expect(familyOf(db, 4)).toBe(2);
  });

  test('a removed member\'s family expenses become personal too', async () => {
    const { repository, db } = repositoryWithDb();
    const userRepository = { getUserById: jest.fn() };
    const service = new FamilyService(repository, {}, userRepository, {}, null, {});

    await service.removeMemberFromFamily(OWNER, String(MEMBER));

    expect(db.familyUser.some(r => r.user_id === MEMBER)).toBe(false);
    expect(familyOf(db, 1)).toBeNull();
    expect(familyOf(db, 3)).toBe(1);
  });
});
