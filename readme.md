# Simple Mail Receiver


## Install
```shell
npm install simple-mail-receiver -S
```

## Usage

### Simple use

``` javascript
import { MailReceiver } from 'simple-mail-receiver'

const config = {
    user: "mail@domain.com",
    password: "pass",
    host: "imap.hostimap.com",
    port: 993,
    tls: true,
    autoReconnect: true,
    tlsOptions: {
        rejectUnauthorized: false
    }
};

const mailReceiver = new MailReceiver(config);

mailReceiver.on('end', () => console.log(`${imap.user} offline`))
mailReceiver.on('connected', () => console.log(` ${imap.user} logged`))
mailReceiver.on('error', err => console.log(err))
mailReceiver.on('mail', mail => 
  console.log({
    subject: mail.headers.get('subject'),
    from: mail.from,
    html: mail.textAsHtml,
    text: mail.text
  })

  mailReceiver.markSeen(mail.uid)
)
mailReceiver.start()

```

#### Result
```shell
{ 
  subject: "Mail subject",
  from: { value: [ { address: 'email@email.com', name: 'Pedro Entringer' } ] },
  html: 'email in html',
  text: 'email in text' 
}
```

## Default Options
```javascript
{
  tls: true,
  markSeen: false,
  box: "INBOX",
  search: ["UNSEEN"],
  autoReconnect: false,
  tlsOptions: {
    rejectUnauthorized: false
  }
}
```

## Event Handler

- start() = Start the imap connection
- stop() = Close the imap connection
- markSeen(uid) = Mark email as seen

## Events On()
- .on('connected', () => { console.log('IMAP connected') } )
- .on("mail', mail => { console.log(mail) } )
- .on("error', err => { console.log(err) } )
- .on("end', () => { console.log('IMAP close') } ) 
- .on("uidvalidity', (uidValidity) => { console.log(uidValidity) } ) 


## Mail object

Parsed mail object has the following properties

- subject (also available from the header mail.headers.get(‘subject’))
- from is an address object for the From: header
- to is an address object for the To: header
- cc is an address object for the Cc: header
- bcc is an address object for the Bcc: header (usually not present)
- date is a Date object for the Date: header
- messageId is the Message-ID value string
- inReplyTo is the In-Reply-To value string
- reply-to is an address object for the Cc: header
- references is an array of referenced Message-ID values
- html is the HTML body of the message. If the message included embedded images as cid: urls then these are all replaced with base64 formatted data: URIs
- text is the plaintext body of the message
- textAsHtml is the plaintext body of the message formatted as HTML
- attachments is an array of attachments
- address object
- Address objects have the following structure:

### Value an array with address details

- name: name part of the email/group
- address: email address
- group: array of grouped addresses
- text: formatted address string for plaintext context
- html: formatted address string for HTML context

### Headers

mail.headers.get('example') 

- from
- subject
- to
- cc
- bcc
- sender
- reply-to
- delivered-to
- return-path
- priority ( ‘high’, ‘normal’, ‘low’)