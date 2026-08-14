import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    return this.prisma.user.create({
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async search(query: string, excludeUserId?: string) {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    return this.prisma.user.findMany({
      where: {
        AND: [
          // Each token must match name OR email (case-insensitive)
          ...tokens.map((token) => ({
            OR: [
              { name: { contains: token, mode: 'insensitive' as const } },
              { email: { contains: token, mode: 'insensitive' as const } },
            ],
          })),
          // Exclude the caller's own user
          ...(excludeUserId ? [{ id: { not: excludeUserId } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      take: 10,
    });
  }

  // Used internally by AuthService for login — returns password field for bcrypt comparison
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}

