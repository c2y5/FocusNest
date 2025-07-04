# FocusNest (base app) 🪹

# Table of Contents
- [What is FocusNest?](#what-is-focusnest)
- [Key Features](#key-features)
  - [Quick Start](#quick-start)
  - [Helpful Tools](#helpful-tools%EF%B8%8F)
  - [Extras](#extras)
- [Preview](#preview)
  - [Dashboard](#dashboard)
  - [Pomodoro Timer](#pomodoro-timer)
  - [Music](#music)
  - [Flashcards](#flashcards)
  - [Settings](#settings)
- [Self-host](#self-host)
  - [Installation](#installation)
  - [Setup Auth0](#setup-auth0)
  - [Setup MongoDB](#setup-mongodb)
  - [Setup AI Configs](#setup-ai-configs)
  - [Live counter](#live-counter)
  - [Upload Music](#upload-music)
  - [Usage](#usage)
  - [Misc](#misc)
- [Project Structure](#project-strcture)
- [License](#license-)
- [Contributing](#contributing-)

## What is FocusNest?
**FocusNest** is a simple web app designed to help you stay focused and get more work done. It combined useful tools in one place:
- ⏱️Pomodoro timer to manage your work/break time
- 📝 AI-powered flashcard maker
- 🎵 Lofi music to help you concentrate

[Try it out yourself here!](https://focusnest.amsky.xyz/)

---

![Banner](./img/FocusNestBanner.png)

---

## Key Features

### Quick Start🚀
- Easy login or try as a guest
- Clean, simple design

### Helpful Tools⚒️
- **Timer**: Custom work/break sessions
- **Flashcards**: Turn notes into study cards instantly
- **Music**: Relaxing background sounds
- **To-do List**: Keep track of what you need to do

### Extras✨
- Streaks to keep you engaged
- Mobile-friendly UI

---

# Preview

## Dashboard
![DashboardPreview](./app/static/img/dashboard-preview.jpg)

## Pomodoro Timer
![PomodoroTimerPreview](./img/PomodoroTimerPreview.png)

## Music
![MusicPreview](./img/MusicPreview.png)

## Flashcards
![FlashcardsPreview](./img/FlashcardsPreview.png)

## Settings
![SettingsPreview](./img/SettingsPreview.png)

---

# Self-host

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/c2y5/focusnest.git
    cd focusnest
    ```

2. Install dependencies (use virtual env if needed)

    ```bash
    pip install -r requirements.txt
    ```

3. Setup ``.env``

    ```
    SECRET_KEY=your_flask_secret_key # PLEASE UPDATE FOR SECURITY

    # Auth0 configuration
    AUTH0_CLIENT_ID=your_auth0_client_id
    AUTH0_CLIENT_SECRET=your_auth0_client_secret
    AUTH0_DOMAIN=your-auth0-domain.auth0.com
    AUTH0_CALLBACK_URL=your_auth0_callback_url (localhost:5000/callback for login)
    AUTH0_LINK_CALLBACK_URL=your_auth0_link_callback_url (localhost:5000/link-callback for linking accounts)

    MONGO_URI=mongodb+srv://user:pass@xxx.xxx.mongodb.net/focusnest?retryWrites=true&w=majority&appName=xxx

    AI_API_URL=https://ai.example.com/chat/completions
    AI_API_KEY=your_api_key_here
    ```

---

## Setup Auth0

1. **Login to [Auth0](https://auth0.com)**
2. **Create an application like the following**

![Auth0CreateApp](./img/Auth0CreateApp.png)

3. **Update your ``.env``**
    - Copy the ``Client Id``, ``Client Secret`` and ``Domain`` and set them in ``.env``
    - If you are NOT using custom domain, your ``Auth0 audience domain`` should be the same as the normal domain
    - If you ARE using custom domain, the audience domain should be the default auth0 provided one

    **Callback URLs**
    - Your ``AUTH0_CALLBACK_URL`` should be the url you are self-hosting from + ``/callback``. E.G. http://localhost:5000/callback
    - `AUTH0_LINK_CALLBACK_URL` would be similar to above except add ``/link-callback``

4. **Let's update our Auth0 settings**
    - Go to the application you created
    - Go to settings
    - Scroll down until you find ``Application URIs``
        - For ``Allowed Callback URLs`` add your link from ``AUTH0_CALLBACK_URL`` AND ``AUTH0_LINK_CALLBACK_URL``
    - Set ``Allowed Logout URLs`` to just the website E.G. http://localhost:5000/
    - Do the same for ``Allowed Web Origins``

    **Social Logins**
    - **This app is designed for 4 social logins: Google, GitHub, Slack and Spotify**
    - On the left side go to Authentication -> Social
    - Create Connection
    - Add the 4 socials (follow the guide on website on how to setup each)
    - Make sure you have them enabled for your application

    **Custom login page/domain**
    - If you want to customise your login page, on the left go to ``Branding -> Universal Login``
    - For domain go to ``Branding -> Custom Domains``


## Setup MongoDB
- Login to [MongoDB](https://mongodb.com/)
- Create a cluster if you havn't already
- Find your cluster and click ``connect``

![ClusterConnect](./img/ClusterConnect.png)

- Click ``Drivers``

![ClusterConnectDrivers](./img/ClusterConnectDrivers.png)

- Set these as your settings

![ClusterConnectSettings](./img/ClusterConnectSettings.png)

- Scroll down until you find ``Add your connection string into your application code``
- Copy the link, would be something like

- ```mongodb+srv://mongodb:<db_password>@<CLUSTERNAME>.<CLUSTERID>.mongodb.net/?retryWrites=true&w=majority&appName=<CLUSTERNAME>```

- In your ``.env`` update ``MONGO_URI`` to the above, make sure to put in your ``db_password``
- For me I added a ``/focusnest`` after the url: ``.net@cluster0.<id>>.mongodb.net/focusnest?``
- You don't have to but I keep it like that for better view

## Setup AI configs
- Make sure to set your AI configs for flashcards!
- Set ``AI_API_URL`` to the completion url. E.G. https://ai.example.com/chat/completions
- Don't forget to put your API key in ``AI_API_KEY``, leave it as ``your_api_key_here`` if there is none

## Live counter
- If you want your own live counter please change the url

![LiveCounter](./img/LiveCounter.png)

- You can find it in ``app/static/js/liveCounter.js`` in ``line 8``
- Change ``focusnest`` into another one e.g. selfhosted_focusnest_abc123

## Upload music
- If you want music, you can put songs (mp3 format) in ``app/static/music``
- To change the album cover replace ``app/static/img/music-placeholder.jpg`` with your own image

## Usage
- Either run

  ```bash
  python app.py
  ```

- or

  ```bash
  bash setup.sh [PORT]
  ```

## Misc
- To update the max file upload size change the value in ``config.py`` in ``lin 10``
- Update ``MAX_CONTENT_LENGTH`` to the size you want
- e.g. ``5 * 1024 * 1024`` for 5MB or ``10 * 1024 * 1024`` for 10MB

---

# Project Strcture

```
FocusNest/
│
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── auth/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── dashboard/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── flashcards/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── guest/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── music/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── settings/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── static/
│   │   ├── avatars/
│   │   ├── css/
│   │   │   ├── flashcardsPage.css
│   │   │   ├── hamburgerMenu.css
│   │   │   ├── musicPage.css
│   │   │   ├── popup.css
│   │   │   ├── settingsPage.css
│   │   │   └── style.css.css
│   │   ├── img/
|   |   |   ├── dashboard-preview.jpg
|   |   |   ├── default-profile.png
|   |   |   ├── favicon.png
|   |   |   ├── logo.png
|   |   |   └── music-placeholder.jpg
│   │   ├── js/
|   |   |   ├── cardHover.js
|   |   |   ├── dashGreeting.js
|   |   |   ├── emotionLogger.js
|   |   |   ├── flashcardsHandler.js
|   |   |   ├── hamburgerMenu.js
|   |   |   ├── linkingHandler.js
|   |   |   ├── liveCounter.js
|   |   |   ├── musicHandler.js
|   |   |   ├── pomodoroTimer.js
|   |   |   ├── popupHandler.js
|   |   |   ├── quote.js
|   |   |   ├── settingsHandler.js
|   |   |   ├── streakHandler.js
|   |   |   ├── tasksHandler.js
|   |   |   ├── timerBase.js
|   |   |   └── timerSettings.js
│   │   ├── music/
│   │   └── sounds/
|   |   |   └── complete.mp3
│   ├── templates/
│   ├── timer/
│   │   ├── __init__.py
│   │   └── routes.py
│   └── __init__.py
├── img/
│   ├── Auth0CreateApp.png
│   ├── ClusterConnect.png
│   ├── ClusterConnectDrivers.png
│   ├── ClusterConnectSettings.png
│   ├── FlashcardsPreview.png
│   ├── FocusNestBanner.png
│   ├── LiveCounter.png
│   ├── MusicPreview.png
│   ├── PomodoroTimerPreview.png
|   └── SettingsPreview.png
├── .env
├── .env.example
├── .gitignore
├── .gitattributes
├── app.py
├── config.py
├── LICENSE
├── README.md
├── requirements.txt
└── setup.sh
```

---

# License 📄

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

# Contributing 🤝

Feel free to submit issues or pull requests! Suggestions to improve **FocusNest** are very welcome.

---