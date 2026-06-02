import { myAttendanceContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockMyAttendance } from '@/data/mock/myAttendance.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

myAttendanceContract('mock', async () => mockMyAttendance(await createStore()));
