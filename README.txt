SHUNCHI TOMAY - REAL FIREBASE SYSTEM
====================================

This project is a real Firebase-connected website.

Files:
- index.html         -> public user site
- admin.html         -> admin login and dashboard
- styles.css         -> full styling
- app.js             -> user-side logic
- admin.js           -> admin-side logic
- firebase/config.js -> Firebase connection and default content
- firebase/firestore.rules -> recommended Firestore rules
- firebase/storage.rules   -> recommended Storage rules

WHAT WORKS NOW
--------------
1. Public user panel without login
2. Admin panel with Firebase email/password login
3. Firestore-based content management
4. Firestore-based message submission
5. Live update of text and content between admin and user side
6. Local private journal
7. Breathing tool, mood check, focus game

IMPORTANT ONE-TIME FIREBASE STEPS
---------------------------------
You still need to do these in Firebase Console:

1. Authentication -> Sign-in method -> Enable Email/Password
2. Create one admin user in Authentication -> Users
3. Firestore Database -> create database (start in production or test, then set rules)
4. Firestore Rules -> paste contents of firebase/firestore.rules
5. Storage -> create bucket if needed, then paste firebase/storage.rules

RUN LOCALLY
-----------
Because Firebase module imports usually need a local server, do not open the HTML file with plain double-click.
Use one of these:

A) VS Code Live Server
- open project folder
- right click index.html
- Open with Live Server

B) Python local server
- open terminal in this folder
- run: python -m http.server 5500
- open: http://localhost:5500

ADMIN LOGIN
-----------
Go to admin.html and log in with the Firebase Authentication email/password you create.

NOTES
-----
- User login is NOT required.
- Admin login IS required.
- Hero image can be changed from the admin panel using any image URL.
- If Firestore rules are not applied yet, messages or admin saves may fail.
