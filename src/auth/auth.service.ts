import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  prisma: PrismaService;
  jwtService: JwtService;
  constructor(prisma: PrismaService, jwtService: JwtService) {
    this.prisma = prisma;
    this.jwtService = jwtService;
  }

  async hashData(data: string) {
    return await argon.hash(data);
  }

  async getTokens(userId: number, email: string): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: process.env.ACCESS_TOKEN_SECRET,
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: process.env.REFRESH_TOKEN_SECRET,
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshTokenHash(userId: number, rt: string) {
    const hash = await this.hashData(rt);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRt: hash },
    });
  }

  async signupLocal(dto: AuthDto): Promise<Tokens> {
    const foundUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (foundUser) throw new ForbiddenException('Email is being used');

    const hash = await this.hashData(dto.password);
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        hash,
      },
    });

    const tokens = await this.getTokens(newUser.id, newUser.email);
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);
    return tokens;
  }

  async signinLocal(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('Access Denied');

    const passwordMatches = await argon.verify(user.hash, dto.password);
    if (!passwordMatches)
      throw new ForbiddenException('Password does not matches');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRt: {
          not: null,
        },
      },
      data: {
        hashedRt: null,
      },
    });
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) throw new ForbiddenException('Access Denied');

    const rtMatches = await argon.verify(user.hashedRt, rt);
    if (!rtMatches)
      throw new ForbiddenException('Refresh Tokens are not match!');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }
}
