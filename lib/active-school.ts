import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'active_school_id';
const DEFAULT_ID  = 'ahbabullah';

let _schoolId = DEFAULT_ID;

export function getActiveSchoolId(): string {
  return _schoolId;
}

export async function loadActiveSchoolId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) _schoolId = saved;
  } catch {}
  return _schoolId;
}

export async function persistActiveSchoolId(id: string): Promise<void> {
  _schoolId = id;
  try { await AsyncStorage.setItem(STORAGE_KEY, id); } catch {}
}

export function resetActiveSchoolId(): void {
  _schoolId = DEFAULT_ID;
}
