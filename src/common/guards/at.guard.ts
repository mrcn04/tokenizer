import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export class AccessTokenGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
}
