import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Users } from "../entities/users.entity";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private usersRepo: Repository<Users>,
    private jwtService: JwtService
  ) {}

  async login(data: { usernameOrEmail: string; password: string }) {
    const { usernameOrEmail, password } = data;

    // 1. Find user by email OR username
    const user = await this.usersRepo.findOne({
      where: [
        { email: usernameOrEmail },
        { username: usernameOrEmail }
      ]
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // 2. Validate password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid password");
    }

    // 3. Generate JWT token
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      username: user.username
    });

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };
  }
}
