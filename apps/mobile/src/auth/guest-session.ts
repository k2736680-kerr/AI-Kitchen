import { environmentConfig } from '../config/environment';
import { GuestSessionService } from './guest-session-service';

export const guestSessionService = new GuestSessionService(environmentConfig.apiBaseUrl);
