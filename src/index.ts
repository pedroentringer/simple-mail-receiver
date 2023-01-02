import * as Imap from 'imap'
import { simpleParser } from 'mailparser'
import * as EventEmitter from 'node:events'

type Options = Partial<Imap.Config> & {
  markSeen: boolean
  box: string
  search: string[]
}

const DEFAULT_OPTIONS: Options = {
  tls: true,
  markSeen: false,
  box: "INBOX",
  search: ["UNSEEN"],
  tlsOptions: {
    rejectUnauthorized: false
  }
}

export class MailReceiver extends EventEmitter{
  private options: Options
  private imap: Imap

  constructor(options: Options){
    super()
    this.options = Object.assign(DEFAULT_OPTIONS, options)
    this.imap = new Imap(this.options as Imap.Config);
  }

  start(){
    this.imap.once('end', () => this.emit('end'));
    this.imap.once('error', (error: Error) => this.emit('error', error));
    this.imap.once('close', (hasError: boolean) => this.emit('close', hasError));
    this.imap.once('uidvalidity', (uidValidity: number) => this.emit('uidvalidity', uidValidity));

    this.imap.once('ready', () => {
        this.emit('ready');
        this.imap.openBox(this.options.box, false, (err) => {
            if (err) {
                this.emit('error', err);
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
        this.emit("error", error)
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
    this.imap.search(this.options.search, (err, searchResults) => {
        if (err) {
            this.emit('error', err);
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
                    this.emit('error', error);
                  })
              });
            });
        });
        
        fetch.once('error', (error) => this.emit('error', error));
    });
    return this;
  };
}