import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { EncryptionService } from "./encryption";

export interface UserData {
  uid: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
  createdAt: Date;
  lastLoginAt: Date;
  encryptedData?: string;
  // Pregnancy health info
  lastCheckupDate?: string;
  currentWeek?: number;
  weight?: number;
  bloodPressure?: string;
  bloodType?: string;
  babyHeartRate?: number;
  notes?: string;
  profileCompleted?: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export class AuthService {
  /**
   * Sign up with email and password
   */
  static async signUp(data: SignupData): Promise<{ user: User; userData: UserData }> {
    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        data.email, 
        data.password
      );

      // Update user profile
      await updateProfile(userCredential.user, {
        displayName: data.name
      });

      // Encrypt sensitive user data
      const sensitiveData = {
        originalName: data.name,
        registrationIP: 'encrypted',
        deviceInfo: navigator.userAgent
      };
      const encryptedData = EncryptionService.encryptToBase64(JSON.stringify(sensitiveData));

      // Create user document in Firestore
      const userData: UserData = {
        uid: userCredential.user.uid,
        email: data.email,
        name: data.name,
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        encryptedData
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      return { user: userCredential.user, userData };
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(data: LoginData): Promise<{ user: User; userData: UserData }> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        data.email, 
        data.password
      );

      // Update last login time
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        userData.lastLoginAt = new Date();
        await setDoc(userDocRef, userData, { merge: true });
        
        return { user: userCredential.user, userData };
      } else {
        throw new Error('User data not found');
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<{ user: User; userData: UserData; isNewUser: boolean }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userData: UserData;
      let isNewUser = false;

      if (!userDoc.exists()) {
        // New user - create profile
        isNewUser = true;
        
        // Encrypt sensitive data
        const sensitiveData = {
          googleId: user.uid,
          photoURL: user.photoURL,
          deviceInfo: navigator.userAgent
        };
        const encryptedData = EncryptionService.encryptToBase64(JSON.stringify(sensitiveData));

        userData = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          provider: 'google',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          encryptedData
        };

        await setDoc(userDocRef, userData);
      } else {
        // Existing user - update last login
        userData = userDoc.data() as UserData;
        userData.lastLoginAt = new Date();
        await setDoc(userDocRef, userData, { merge: true });
      }

      return { user, userData, isNewUser };
    } catch (error: any) {
      console.error('Google signin error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Signout error:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user data from Firestore
   */
  static async getCurrentUserData(): Promise<UserData | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      return null;
    } catch (error) {
      console.error('Get user data error:', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Email check error:', error);
      return false;
    }
  }

  /**
   * Decrypt user data
   */
  static decryptUserData(encryptedData: string): any {
    try {
      const decrypted = EncryptionService.decryptFromBase64(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decrypt user data error:', error);
      return null;
    }
  }

  /**
   * Update user data in Firestore
   */
  static async updateUserData(uid: string, updates: Partial<UserData>): Promise<void> {
    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
    } catch (error: any) {
      console.error('Update user data error:', error);
      throw new Error(error.message || 'Failed to update user data');
    }
  }
}
