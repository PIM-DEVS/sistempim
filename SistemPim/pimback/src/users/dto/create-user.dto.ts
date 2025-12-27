export class CreateUserDto {
  email: string;
  name: string;
  photoUrl?: string;
  bio?: string;
  jobTitle?: string;
  skills?: string[];
}