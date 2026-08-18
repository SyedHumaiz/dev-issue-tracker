import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    // Check for existing email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user — store hash, never plain-text
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        jobTitle: dto.jobTitle,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        jobTitle: true,
        bio: true,
        skills: true,
        githubUrl: true,
        linkedinUrl: true,
        yearsExperience: true,
        location: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const accessToken = this.signToken(user.id, user.email);

    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    // Fetch user WITH password for comparison
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Generic error — never reveal whether email or password was wrong
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signToken(user.id, user.email);

    // Return user without password
    const { password: _omit, githubAccessToken: _githubAccessToken, ...safeUser } = user;

    return { accessToken, user: safeUser };
  }

  async connectGithub(userId: string, github: { githubId: string; githubUsername: string; accessToken: string }) {
    return this.usersService.connectGithub(userId, { id: github.githubId, username: github.githubUsername, accessToken: github.accessToken });
  }

  async disconnectGithub(userId: string) {
    return this.usersService.disconnectGithub(userId);
  }

  private signToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
