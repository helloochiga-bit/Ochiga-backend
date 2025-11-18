import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { InjectSupabaseClient } from '../supabase/supabase.provider';

@Injectable()
export class AuthService {
  constructor(
    @InjectSupabaseClient()
    private readonly supabase: SupabaseClient,
  ) {}

  async login(dto: { usernameOrEmail: string; password: string }) {
    const { usernameOrEmail, password } = dto;

    let emailToUse = '';

    // 1️⃣ CHECK IF INPUT IS EMAIL
    const isEmail = usernameOrEmail.includes('@');

    if (isEmail) {
      // Direct email login
      emailToUse = usernameOrEmail;
    } else {
      // 2️⃣ INPUT IS USERNAME → FETCH EMAIL FROM DB
      const { data: userByUsername, error: usernameError } = await this.supabase
        .from('users')
        .select('email')
        .eq('username', usernameOrEmail)
        .single();

      if (usernameError || !userByUsername) {
        throw new UnauthorizedException('Invalid username or password.');
      }

      emailToUse = userByUsername.email;
    }

    // 3️⃣ LOGIN USING EMAIL + PASSWORD
    const { data: authData, error: authError } =
      await this.supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

    if (authError || !authData.session) {
      throw new UnauthorizedException('Invalid login credentials.');
    }

    const supabaseUserId = authData.user.id;

    // 4️⃣ FETCH FULL CUSTOM USER PROFILE
    const { data: userRecord, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUserId)
      .single();

    if (userError || !userRecord) {
      throw new UnauthorizedException('User profile not found.');
    }

    // 5️⃣ RETURN TOKEN + USER
    return {
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: userRecord,
    };
  }
}
