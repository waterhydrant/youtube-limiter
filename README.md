# Intentional YouTube Blocker

A Chrome extension that adds intentional friction before opening YouTube and blocks YouTube completely under certain conditions. The goal is not just to block distractions, but to make YouTube use more deliberate.

## Features

- Shows an affirmation popup before allowing a new YouTube session
- Blocks YouTube after 8 PM
- Blocks YouTube after it has already been used once in the current day
- Supports a full-block mode that disables YouTube completely
- Tracks the number of days since the last YouTube use
- Displays the current streak on the extension badge
- Uses a custom blocked page when YouTube access is not allowed
- Handles YouTube navigation through Chrome's `webNavigation` API

## Purpose

YouTube can be useful, but it is easy to open automatically without thinking. This extension creates a pause before entering YouTube so that usage becomes a conscious choice.

The blocker is designed around the idea that attention and energy are limited. If YouTube is genuinely worth using, the user can intentionally confirm that choice. If it is too late, already used today, or globally blocked, the extension redirects to a dedicated blocked page.

## How It Works

When a YouTube page is opened, the background script watches for top-frame navigation events. If the navigation appears to be a new YouTube session, the extension decides whether the page should be allowed, shown an affirmation popup, or redirected to a blocked page.

The extension currently uses these blocking reasons:

- `blocked` — YouTube is fully blocked by settings
- `usedToday` — YouTube has already been used today
- `time` — YouTube is blocked after 8 PM

If YouTube is allowed, the content script displays an affirmation popup. Once the user completes the affirmation, the session is recorded for the day.

The background script also updates the extension badge to show the current streak based on the last recorded YouTube use.

## Installation

1. Clone or download this repository.

2. Open Chrome.

3. Go to:

   ```txt
   chrome://extensions
   ```

4. Enable **Developer mode**.

5. Click **Load unpacked**.

6. Select the extension folder.

## Design Notes

This extension uses two different blocking approaches:

### Affirmation Popup

Used when YouTube is technically allowed, but the user should pause before entering.

This is injected into the YouTube page.

### Blocked Page

Used when YouTube should not be accessible at all.

This redirects the tab to a custom extension page instead of leaving YouTube loaded underneath.

This separation keeps the behavior clear:

```txt
Allowed but needs friction → popup
Not allowed → blocked page
```

## Philosophy

This extension is not meant to punish the user. It is meant to make automatic behavior visible.

The core question is:

> Is watching YouTube actually the best use of my limited energy right now?

If yes, the extension allows intentional use. If no, it helps protect attention before the habit loop starts.
