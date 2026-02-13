'use server';

// Legacy actions stubbed to remove Neon dependencies.
// TODO: Migrate data fetching to Python API via client components.

export async function getSecurityLogs() {
    return [];
}

export async function getUsersList() {
    return [];
}

export async function getUserDetails(userId: string) {
    return null;
}

export async function getUserLogs(userId: string) {
    return [];
}

export async function logTicketActivity(data: any) {
    return { success: true };
}

export async function logDocumentActivity(data: any) {
    return { success: true };
}

export async function deleteUser(userId: string) {
    return { success: false, error: 'Migrated to Python' };
}

export async function updateUserStatus(userId: string, newStatus: string) {
    return { success: false, error: 'Migrated to Python' };
}
