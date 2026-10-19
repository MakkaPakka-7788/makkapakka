# Configure Private Chat

The chat page is committed, but Firebase Console settings must be applied by a project owner. The repository connection cannot change your Firebase Console settings directly.

## 1. Enable Google sign-in

1. Open https://console.firebase.google.com/project/flashcard-com/authentication/providers
2. Open **Sign-in method** (or **Sign-in providers**).
3. Enable **Google** and save.
4. In Authentication settings, open **Authorized domains** and make sure `makkapakka-7788.github.io` is listed. Add it if it is missing.

## 2. Add the Firestore rules

1. Open https://console.firebase.google.com/project/flashcard-com/firestore/rules
2. Copy your current rules somewhere safe first.
3. Keep your existing `/users/{userId}` and saves rules unchanged.
4. Inside your existing `service cloud.firestore { match /databases/{database}/documents { ... } }` block, paste the helper function and `match /chats/{chatId}` rules from [chat-firestore-rules.txt](./chat-firestore-rules.txt). The helper function must be inside the database documents match block, and the chat match must also be inside that block.
5. Publish the merged rules.

Do not replace all existing rules with only the chat rules, because that could break saved user data features.

## 3. Test

1. Open https://makkapakka-7788.github.io/makkapakka/chat.html
2. Sign in with Google.
3. Click **New** and copy the invite link.
4. Open the invite link in a second browser profile signed into a different Google account.
5. Send a test message from each account.

If you see a Firestore permission error, check that the rules were merged and published correctly. Do not make the chats collection public to fix permissions.

## Privacy notes

Chats are limited to participants by Firestore rules, but this is not end-to-end encryption. An invited person can read and copy messages. Anyone who obtains an unused invite link may be able to join that pending chat, so share invite links privately.
