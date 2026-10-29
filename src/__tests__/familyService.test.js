jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const FamilyService = require('../services/FamilyService');

const OWNER = 1;
const MEMBER = 2;
const OUTSIDER = 3;
const OTHER_OWNER = 4;

// In-memory store behind the repositories: tests assert resulting state, not call signatures
function makeWorld({ premium = [OWNER, MEMBER, OUTSIDER, OTHER_OWNER] } = {}) {
  const users = new Map([
    [OWNER, { id: OWNER, username: 'owner', first_name: 'Owner' }],
    [MEMBER, { id: MEMBER, username: 'member', first_name: 'Member' }],
    [OUTSIDER, { id: OUTSIDER, username: 'outsider', first_name: 'Outsider' }],
    [OTHER_OWNER, { id: OTHER_OWNER, username: 'other', first_name: 'Other' }]
  ]);
  const families = new Map();
  const members = new Map(); // userId -> familyId
  const invitations = new Map(); // code -> invitation
  const expenses = [];
  let nextFamilyId = 1;
  let nextInvitationId = 1;

  const familyRepository = {
    createFamily: jest.fn(async (ownerId, name) => {
      const family = { id: nextFamilyId++, name, owner_id: ownerId };
      families.set(family.id, family);
      members.set(ownerId, family.id);
      return family;
    }),
    getFamilyById: jest.fn(async (id) => families.get(id)),
    getFamilyByOwnerId: jest.fn(async (ownerId) => [...families.values()].find(f => f.owner_id === ownerId)),
    getUserFamily: jest.fn(async (userId) => families.get(members.get(userId))),
    addMemberToFamily: jest.fn(async (familyId, userId) => { members.set(userId, familyId); }),
    // Как репозиторий: удалённая строка family_user или undefined, если участника уже нет
    removeMemberFromFamily: jest.fn(async (familyId, userId) => {
      if (members.get(userId) !== familyId) return undefined;
      members.delete(userId);
      return { family_id: familyId, user_id: userId };
    }),
    isUserInFamily: jest.fn(async (userId, familyId) => members.get(userId) === familyId),
    getFamilyMembers: jest.fn(async (familyId) => [...members.entries()]
      .filter(([, fid]) => fid === familyId)
      .map(([uid]) => ({ id: uid, role: families.get(familyId).owner_id === uid ? 'owner' : 'member' }))),
    convertFamilyExpensesToPersonal: jest.fn(async (familyId) => {
      expenses.filter(e => e.family_id === familyId).forEach(e => { e.family_id = null; });
    }),
    deleteFamily: jest.fn(async (familyId) => {
      families.delete(familyId);
      for (const [uid, fid] of members) if (fid === familyId) members.delete(uid);
    })
  };

  const familyInvitationRepository = {
    createInvitation: jest.fn(async (familyId, inviterId, inviteeId) => {
      const id = nextInvitationId++;
      const invitation = {
        id,
        family_id: familyId,
        inviter_id: String(inviterId), // BIGINT columns come back from pg as strings
        invitee_id: String(inviteeId),
        invite_code: `CODE${id}`,
        status: 'pending',
        expires_at_utc: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      };
      invitations.set(invitation.invite_code, invitation);
      return invitation;
    }),
    getInvitationByCode: jest.fn(async (code) => invitations.get(code)),
    hasPendingInvitation: jest.fn(async (inviteeId, familyId) => [...invitations.values()]
      .some(i => Number(i.invitee_id) === inviteeId && i.family_id === familyId && i.status === 'pending')),
    expireOldInvitations: jest.fn(async () => {
      for (const i of invitations.values()) {
        if (i.status === 'pending' && new Date(i.expires_at_utc) <= new Date()) i.status = 'expired';
      }
    }),
    updateInvitationStatusByCode: jest.fn(async (code, status) => { invitations.get(code).status = status; })
  };

  const userRepository = {
    getUserById: jest.fn(async (id) => users.get(id)),
    findUsersByUsername: jest.fn(async (username) => [...users.values()]
      .filter(u => u.username.toLowerCase() === username.toLowerCase()))
  };

  const premiumService = {
    isPremiumUser: jest.fn(async (id) => premium.includes(id))
  };

  const notificationService = {
    sendFamilyInvitation: jest.fn(async () => {}),
    sendFamilyMemberRemoved: jest.fn(async () => {}),
    sendInvitationCancelled: jest.fn(async () => {})
  };

  const service = new FamilyService(familyRepository, familyInvitationRepository, userRepository, {}, notificationService, premiumService);
  return { service, families, members, invitations, expenses, notificationService };
}

// Owner with a family; MEMBER already joined
async function withFamily(opts) {
  const world = makeWorld(opts);
  const family = await world.service.createFamily(OWNER, 'Home');
  world.members.set(MEMBER, family.id);
  return { ...world, family };
}

describe('FamilyService.createFamily', () => {
  test('creates a family with the creator as owner and member', async () => {
    const { service, members } = makeWorld();
    const family = await service.createFamily(OWNER, 'Home');
    expect(family.owner_id).toBe(OWNER);
    expect(members.get(OWNER)).toBe(family.id);
  });

  test('an owner cannot create a second family', async () => {
    const { service } = makeWorld();
    await service.createFamily(OWNER, 'Home');
    await expect(service.createFamily(OWNER, 'Second')).rejects.toThrow('User already owns a family');
  });

  test('a member of another family cannot create one', async () => {
    const { service, families } = await withFamily();
    await expect(service.createFamily(MEMBER, 'Mine')).rejects.toThrow('User is already a member of a family');
    expect(families.size).toBe(1);
  });
});

describe('FamilyService.leaveFamily', () => {
  test('a member leaves the family', async () => {
    const { service, members, family } = await withFamily();
    await expect(service.leaveFamily(MEMBER)).resolves.toMatchObject({ id: family.id });
    expect(members.has(MEMBER)).toBe(false);
  });

  test('the owner cannot leave', async () => {
    const { service, members, family } = await withFamily();
    await expect(service.leaveFamily(OWNER)).rejects.toThrow('Family owner cannot leave family');
    expect(members.get(OWNER)).toBe(family.id);
  });

  test('a user without a family cannot leave', async () => {
    const { service } = makeWorld();
    await expect(service.leaveFamily(OUTSIDER)).rejects.toThrow('User is not a member of any family');
  });
});

describe('FamilyService.deleteFamily', () => {
  test('owner deletes the family and its expenses become personal', async () => {
    const { service, families, members, expenses, family } = await withFamily();
    expenses.push({ id: 10, user_id: OWNER, family_id: family.id }, { id: 11, user_id: MEMBER, family_id: family.id });
    await service.deleteFamily(OWNER);
    expect(families.size).toBe(0);
    expect(members.has(MEMBER)).toBe(false);
    expect(expenses.map(e => e.family_id)).toEqual([null, null]);
  });

  test('a regular member cannot delete the family', async () => {
    const { service, families, expenses, family } = await withFamily();
    expenses.push({ id: 10, user_id: MEMBER, family_id: family.id });
    await expect(service.deleteFamily(MEMBER)).rejects.toThrow('Only family owner can delete family');
    expect(families.has(family.id)).toBe(true);
    expect(expenses[0].family_id).toBe(family.id);
  });

  test('a user without a family gets an error', async () => {
    const { service } = makeWorld();
    await expect(service.deleteFamily(OUTSIDER)).rejects.toThrow('User is not a member of any family');
  });
});

describe('FamilyService.createInvitation', () => {
  test('owner invites a premium user, who is notified with the code', async () => {
    const { service, invitations, notificationService, family } = await withFamily();
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    expect(invitations.get(invitation.invite_code)).toMatchObject({ family_id: family.id, status: 'pending' });
    expect(notificationService.sendFamilyInvitation).toHaveBeenCalledWith(OUTSIDER, 'Home', 'owner', invitation.invite_code);
  });

  test('a regular member cannot invite', async () => {
    const { service, invitations } = await withFamily();
    await expect(service.createInvitation(MEMBER, 'outsider')).rejects.toThrow('Only family owner can invite members');
    expect(invitations.size).toBe(0);
  });

  test('a user without a family cannot invite', async () => {
    const { service } = makeWorld();
    await expect(service.createInvitation(OUTSIDER, 'member')).rejects.toThrow('User is not a member of any family');
  });

  test('unknown username is rejected', async () => {
    const { service } = await withFamily();
    await expect(service.createInvitation(OWNER, 'nobody')).rejects.toThrow('User not found');
  });

  test('a non-premium invitee is rejected', async () => {
    const { service, invitations, notificationService } = await withFamily({ premium: [OWNER, MEMBER] });
    await expect(service.createInvitation(OWNER, 'outsider')).rejects.toThrow('User does not have premium status');
    expect(invitations.size).toBe(0);
    expect(notificationService.sendFamilyInvitation).not.toHaveBeenCalled();
  });

  test('inviting someone already in this family is rejected', async () => {
    const { service } = await withFamily();
    await expect(service.createInvitation(OWNER, 'member')).rejects.toThrow('User is already a member of your family');
  });

  test('inviting someone from another family is rejected', async () => {
    const { service } = await withFamily();
    await service.createFamily(OTHER_OWNER, 'Other');
    await expect(service.createInvitation(OWNER, 'other')).rejects.toThrow('User is already a member of another family');
  });

  test('a second pending invitation to the same user is rejected', async () => {
    const { service, invitations } = await withFamily();
    await service.createInvitation(OWNER, 'outsider');
    await expect(service.createInvitation(OWNER, 'outsider')).rejects.toThrow('User already has a pending invitation');
    expect(invitations.size).toBe(1);
  });
});

describe('FamilyService.acceptInvitation', () => {
  async function invited() {
    const world = await withFamily();
    const { invitation } = await world.service.createInvitation(OWNER, 'outsider');
    return { ...world, code: invitation.invite_code };
  }

  test('invitee joins the family and the invitation is consumed', async () => {
    const { service, members, invitations, family, code } = await invited();
    const result = await service.acceptInvitation(OUTSIDER, code);
    expect(result.family.id).toBe(family.id);
    expect(members.get(OUTSIDER)).toBe(family.id);
    expect(invitations.get(code).status).toBe('accepted');
    await expect(service.acceptInvitation(OUTSIDER, code)).rejects.toThrow('Invitation is not pending');
  });

  test('unknown code is rejected', async () => {
    const { service, members } = await invited();
    await expect(service.acceptInvitation(OUTSIDER, 'NOPE')).rejects.toThrow('Invitation not found');
    expect(members.has(OUTSIDER)).toBe(false);
  });

  test('someone else cannot use the invitee\'s code', async () => {
    const { service, members, invitations, code } = await invited();
    await expect(service.acceptInvitation(OTHER_OWNER, code)).rejects.toThrow('Invalid invitation code');
    expect(members.has(OTHER_OWNER)).toBe(false);
    expect(invitations.get(code).status).toBe('pending');
  });

  test('expired invitation is rejected', async () => {
    const { service, members, invitations, code } = await invited();
    invitations.get(code).expires_at_utc = new Date(Date.now() - 1000).toISOString();
    await expect(service.acceptInvitation(OUTSIDER, code)).rejects.toThrow('Invitation has expired');
    expect(members.has(OUTSIDER)).toBe(false);
    expect(invitations.get(code).status).toBe('expired');
  });

  test('rejected or cancelled invitation cannot be accepted', async () => {
    const { service, members, invitations, code } = await invited();
    invitations.get(code).status = 'expired';
    await expect(service.acceptInvitation(OUTSIDER, code)).rejects.toThrow('Invitation is not pending');
    expect(members.has(OUTSIDER)).toBe(false);
  });

  test('a user who joined another family meanwhile cannot accept', async () => {
    const { service, members, invitations, code } = await invited();
    const other = await service.createFamily(OUTSIDER, 'Own');
    await expect(service.acceptInvitation(OUTSIDER, code)).rejects.toThrow('User is already a member of a family');
    expect(members.get(OUTSIDER)).toBe(other.id);
    expect(invitations.get(code).status).toBe('pending');
  });
});

describe('FamilyService.rejectInvitation', () => {
  test('invitee rejects; the code can no longer be accepted', async () => {
    const { service, members, invitations } = await withFamily();
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    await service.rejectInvitation(OUTSIDER, invitation.invite_code);
    expect(invitations.get(invitation.invite_code).status).toBe('rejected');
    await expect(service.acceptInvitation(OUTSIDER, invitation.invite_code)).rejects.toThrow('Invitation is not pending');
    expect(members.has(OUTSIDER)).toBe(false);
  });

  test('only the invitee can reject', async () => {
    const { service, invitations } = await withFamily();
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    await expect(service.rejectInvitation(OTHER_OWNER, invitation.invite_code)).rejects.toThrow('Invalid invitation code');
    expect(invitations.get(invitation.invite_code).status).toBe('pending');
  });
});

describe('FamilyService.cancelInvitation', () => {
  test('owner cancels; invitee is notified and cannot accept', async () => {
    const { service, invitations, notificationService } = await withFamily();
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    await service.cancelInvitation(OWNER, invitation.invite_code);
    expect(invitations.get(invitation.invite_code).status).toBe('expired');
    expect(notificationService.sendInvitationCancelled).toHaveBeenCalledWith(invitation.invitee_id, 'Home', 'owner');
    await expect(service.acceptInvitation(OUTSIDER, invitation.invite_code)).rejects.toThrow('Invitation is not pending');
  });

  test('a user from another family cannot cancel', async () => {
    const { service, invitations } = await withFamily();
    await service.createFamily(OTHER_OWNER, 'Other');
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    await expect(service.cancelInvitation(OTHER_OWNER, invitation.invite_code)).rejects.toThrow('Not authorized to cancel this invitation');
    expect(invitations.get(invitation.invite_code).status).toBe('pending');
  });

  test('a member who did not create the invitation cannot cancel it', async () => {
    const { service, invitations } = await withFamily();
    const { invitation } = await service.createInvitation(OWNER, 'outsider');
    await expect(service.cancelInvitation(MEMBER, invitation.invite_code))
      .rejects.toThrow('Only family owner or invitation creator can cancel invitation');
    expect(invitations.get(invitation.invite_code).status).toBe('pending');
  });
});

describe('FamilyService.removeMemberFromFamily', () => {
  test('owner removes a member, who is notified', async () => {
    const { service, members, notificationService } = await withFamily();
    await service.removeMemberFromFamily(OWNER, MEMBER);
    expect(members.has(MEMBER)).toBe(false);
    expect(notificationService.sendFamilyMemberRemoved).toHaveBeenCalledWith(MEMBER, 'Home', { lostFamilyPremium: false });
  });

  test('a regular member cannot remove others', async () => {
    const { service, members, family } = await withFamily();
    await expect(service.removeMemberFromFamily(MEMBER, OWNER)).rejects.toThrow('Only family owner can remove members');
    expect(members.get(OWNER)).toBe(family.id);
  });

  test('cannot remove someone who is not in the family', async () => {
    const { service } = await withFamily();
    await expect(service.removeMemberFromFamily(OWNER, OUTSIDER)).rejects.toThrow('User is not a member of this family');
  });

  test('owner cannot remove themselves', async () => {
    const { service, members, family } = await withFamily();
    await expect(service.removeMemberFromFamily(OWNER, OWNER)).rejects.toThrow('Cannot remove yourself from family');
    expect(members.get(OWNER)).toBe(family.id);
  });
});

describe('FamilyService.getFamilyMembersForOwner', () => {
  test('owner sees all members', async () => {
    const { service } = await withFamily();
    const list = await service.getFamilyMembersForOwner(OWNER);
    expect(list.map(m => m.id).sort()).toEqual([OWNER, MEMBER]);
  });

  test('a regular member cannot view the list', async () => {
    const { service } = await withFamily();
    await expect(service.getFamilyMembersForOwner(MEMBER)).rejects.toThrow('Only family owner can view members');
  });
});
