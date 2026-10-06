export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<void>;
}

export type CapturedEmail = SendEmailInput & {
  id: string;
  createdAt: string;
};
