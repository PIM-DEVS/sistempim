export class CreatePostDto { // <--- TEM QUE TER O 'export'
  content: string;
  userEmail: string;
  userName?: string;
  userPhoto?: string;
}