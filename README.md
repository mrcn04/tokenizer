# tokenizer

A good way of handling access tokens and refresh tokens with Nestjs and Passportjs by using Prisma as the ORM, PostgreSQL
as the Database and Argon as the hash method.\
<br />
The reason I use Argon instead of Bcrypt is that Bcrypt is only good for passwords that have less than 74 bytes. Since our refresh token is a JWT, it will be longer than 74 bytes.

### Installation

```
yarn install
```

### How to Run

##### Start the Database

```
docker compose up
```

##### Then start the app

```
yarn start:dev
```
