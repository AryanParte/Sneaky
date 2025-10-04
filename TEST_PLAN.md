# Sneaky End-to-End Test Plan

Manual test scenarios that exercise the full Electron app. Run these after each major change or release candidate build.

## 0. Preconditions
- Launch Sneaky via `npm run dev` or a packaged build.
- A valid `OPENAI_API_KEY` exists in `.env` or is entered through Settings.
- Optional for capture tests: `robotjs`, `screenshot-desktop`, `node-tesseract-ocr`, and an audio loopback driver (BlackHole on macOS).

## 1. Application Boot & Overlay Basics
1. Start the app, confirm the main dashboard loads with Sneaky branding.
2. Press `Cmd+Shift+O` (or `Ctrl+Shift+O` on Windows); overlay strip should appear centered near the bottom.
3. Toggle shortcut again; overlay hides, leaving screen clear. Toggle once more; overlay returns in the same spot.
4. Press `Cmd+Shift+I` / `Ctrl+Shift+I`; overlay status pill switches between “Interact” and “Ghost” and click handling matches the mode.

## 2. Settings Modal
1. Click **Open Settings**; modal appears with scrollable content on small screens.
2. Change AI model; save, reopen modal, and confirm the selection persisted.
3. Adjust overlay opacity to 0.3 then to 0.9; observe strip tone updating each time.
4. Toggle audio and auto-capture switches; the labels update immediately and the values persist after app restart.
5. Close settings via button or `Esc`; modal disappears and app remains responsive.

## 3. Overlay Command Bar
1. Click the pencil icon to show input. Type “hello” and press **Ask**. Assistant reply should render in the answer box.
2. Repeat, pressing only `Enter` while the input is focused; chat should still send.
3. Press the circular reset icon; both input and answer clear.
4. Open the ellipsis menu; choose **History** to view the modal. Close it again.
5. From the ellipsis menu choose **Quit Sneaky**; application exits cleanly.

## 4. Chat & AI Responses
1. Send “Hi Sneaky” through the overlay; expect a valid reply.
2. Send a follow-up referencing the previous answer; assistant should maintain context.
3. Remove the API key (clear `.env`, restart), attempt a chat; overlay shows the warning `Add OPENAI_API_KEY in .env or Settings.`
4. Temporarily disable network, send a chat; error message should surface the underlying OpenAI failure text, not a generic message.

## 5. Screen Capture (requires OCR dependencies)
1. From the dashboard, click **Test screen capture**; status transitions through “Capturing screen” to “Suggestions ready” and overlay receives content.
2. Use the shortcut `Cmd+Shift+Space` / `Ctrl+Shift+Space` while overlay is visible; same behavior should occur.
3. Disable screen capture in Settings; buttons become inactive and attempting capture produces the settings warning.
4. If OCR binaries are missing, attempting capture displays “Screen capture unavailable: required modules not loaded or failed”.

## 6. Audio Capture (requires loopback driver)
1. Click **Test audio capture**; status shows recording, then transcription, then sends the transcript to chat.
2. Use `Cmd+Shift+A` / `Ctrl+Shift+A`; overlay responds with the audio summary.
3. Toggle audio off in Settings; button disables and status warns.
4. Without BlackHole installed, confirm the overlay banner prompts installation.

## 7. History & Persistence
1. Submit several chats; open History modal to ensure chronological listing.
2. Close the overlay window (via DevTools or scripting) and reopen with the shortcut; last chat persists.
3. Quit the entire app and relaunch; verify settings (model, opacity, toggles) are restored.

## 8. Window Position & Movement
1. Move overlay with keyboard shortcuts (`Cmd/Ctrl+Shift+Arrow`); expect 80px movement per key press.
2. Drag the overlay by its body; position updates smoothly and sticks after hide/show.
3. If using multiple monitors, drag to another display; ensure shortcuts still interact with it.

## 9. Build & Packaging Smoke
1. Run `npm run react-build`; build succeeds without warnings or errors.
2. Run `npm run package` (macOS only) to produce DMG/PKG; completes when signing/notarization prerequisites are in place.

## 10. Regression Spot Checks After Updates
- Overlay opacity slider still changes tone and border strength.
- Microphone button visibly changes state when listening/transcribing.
- Global Ask shortcut (`Cmd/Ctrl+Return`) triggers chat even when overlay input is hidden.
- Automatic screen monitoring (if auto-capture enabled) does not interrupt manual chat or create duplicate overlays.

This test plan can be automated later using Playwright or Spectron; for now it serves as the manual acceptance checklist for Sneaky builds.
