import * as Imap from 'imap'
import { ParsedMail, simpleParser } from 'mailparser'
import * as EventEmitter from 'node:events'

type Options = Partial<Imap.Config> & {
  markSeen: boolean
  box: string
  search: string[]
  autoReconnect: boolean
}

const DEFAULT_OPTIONS: Options = {
  tls: true,
  markSeen: false,
  box: "INBOX",
  search: ["UNSEEN"],
  autoReconnect: false,
  tlsOptions: {
    rejectUnauthorized: false
  }
}

type Mail = { uid: string } & ParsedMail
interface MailReceiverEvents {
  error: (error: Error) => void,
  ready: () => void
  end: () => void
  close: (hasError: boolean) => void
  uidvalidity: (uidValidity: number) => void
  mail: (parsedMail: Mail) => void
}

export declare interface MailReceiver {
  on<U extends keyof MailReceiverEvents>(
    event: U, listener: MailReceiverEvents[U]
  ): this;

  emit<U extends keyof MailReceiverEvents>(
    event: U, ...args: Parameters<MailReceiverEvents[U]>
  ): boolean;
}

type MailError = {
  code?: string
} & Error
export class MailReceiver extends EventEmitter{
  private options: Options
  private imap: Imap

  constructor(options: Options){
    super()
    this.options = Object.assign(DEFAULT_OPTIONS, options)
    this.imap = new Imap(this.options as Imap.Config);
  }

  private errorHandler(error: MailError){
    if(error?.code === "ETIMEDOUT" && this.options.autoReconnect){
      this.imap.connect();
    }else{
      this.emit('error', error)
    }
  }

  start(){
    this.imap.once('end', () => this.emit('end'));
    this.imap.once('error', (error: MailError) => this.errorHandler(error));
    this.imap.once('close', (hasError: boolean) => this.emit('close', hasError));
    this.imap.once('uidvalidity', (uidValidity: number) => this.emit('uidvalidity', uidValidity));

    this.imap.once('ready', () => {
        this.emit('ready');
        this.imap.openBox(this.options.box, false, (error) => {
            if (error) {
                this.errorHandler(error)
                return;
            }

            this.scan();
            this.imap.on('mail', () => {
                this.scan();
            });
        });
    });

    this.imap.connect();
    return this;
  }

  markSeen(uid: number){
    this.imap.addFlags(uid, ['\\Seen'], (error) => {
      if (error) {
        this.errorHandler(error)
      }
    });
  }

  stop(){
    if (this.imap.state !== 'disconnected') {
      this.imap.end();
    }

    return this
  }

  private scan() {
    this.imap.search(this.options.search, (error, searchResults) => {
        if (error) {
            this.errorHandler(error)
            return;
        }

        if (!searchResults || searchResults.length === 0) {
            return;
        }

        var fetch = this.imap.fetch(searchResults, {
            markSeen: this.options.markSeen !== false,
            bodies: ''
        });

        fetch.on('message', (msg) => {
            msg.once('body', (stream) => {
              msg.once('attributes', (attrs) => {
                const uid = attrs.uid;

                simpleParser(stream)
                  .then(mail => {
                    this.emit('mail', {uid, ...mail});
                  }).catch(error => {
                    this.errorHandler(error)
                  })
              });
            });
        });
        
        fetch.once('error', (error) => this.errorHandler(error));
    });
    return this;
  };
}