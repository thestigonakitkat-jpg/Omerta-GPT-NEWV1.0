// Anonymous Groups Management
import { v4 as uuidv4 } from 'uuid';

// Greek pseudonym generator
const GREEK_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
  'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'
];

/**
 * Generate a Greek pseudonym
 */
function generatePseudonym() {
  const name = GREEK_NAMES[Math.floor(Math.random() * GREEK_NAMES.length)];
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${name}-${suffix}`;
}

/**
 * Create an anonymous group
 */
export function createGroup(ownerOid) {
  const group = {
    id: uuidv4(),
    owner: ownerOid,
    members: new Set([ownerOid]),
    pseudonyms: new Map([[ownerOid, generatePseudonym()]]),
    created: Date.now(),
    disbandTimeout: null,
  };
  
  console.log(`🎭 Created anonymous group: ${group.id}`);
  return group;
}

/**
 * Join an anonymous group
 */
export function joinGroup(group, memberOid) {
  if (group.members.size >= 8) {
    throw new Error('Group full (max 8 members)');
  }
  
  group.members.add(memberOid);
  group.pseudonyms.set(memberOid, generatePseudonym());
  
  console.log(`🎭 ${memberOid} joined group as ${group.pseudonyms.get(memberOid)}`);
  return group;
}

/**
 * Leave an anonymous group
 */
export function leaveGroup(group, memberOid) {
  group.members.delete(memberOid);
  group.pseudonyms.delete(memberOid);
  
  // If owner leaves, set 5-minute grace period
  if (memberOid === group.owner) {
    console.log('🎭 Owner left group, starting 5-minute grace period');
    group.disbandTimeout = setTimeout(() => {
      if (!group.members.has(group.owner)) {
        console.log('🎭 Group disbanded after owner timeout');
        // In real app, this would clean up the group
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  console.log(`🎭 ${memberOid} left the group`);
  return group;
}

/**
 * Get member pseudonym
 */
export function getMemberPseudonym(group, memberOid) {
  return group.pseudonyms.get(memberOid) || 'Unknown';
}

/**
 * Check if group is valid
 */
export function isGroupValid(group) {
  return group.members.size > 0 && (group.members.has(group.owner) || !group.disbandTimeout);
}

/**
 * Generate letter avatar for pseudonym
 */
export function generateLetterAvatar(pseudonym) {
  const letter = pseudonym.charAt(0).toUpperCase();
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  const colorIndex = pseudonym.charCodeAt(0) % colors.length;
  
  return {
    letter,
    backgroundColor: colors[colorIndex],
    textColor: '#FFFFFF'
  };
}