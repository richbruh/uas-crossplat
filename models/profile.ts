export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

// Helper functions
export function getDisplayName(profile: Profile): string {
  return profile.full_name || 'Anonymous User';
}

export function getProfileImageUrl(profile: Profile): string {
  return profile.avatar_url || 'https://via.placeholder.com/120';
}

export function getRoleBadgeColor(role: string): string {
  switch(role.toLowerCase()) {
    case 'admin':
      return '#dc3545'; // Red
    case 'teacher':
      return '#fd7e14'; // Orange
    case 'student':
      return '#28a745'; // Green
    default:
      return '#6c757d'; // Gray
  }
}