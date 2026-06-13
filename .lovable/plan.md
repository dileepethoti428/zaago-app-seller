Add an eye-icon toggle button next to every password field on the Login page so users can show/hide their password while typing.

Changes:
1. In `src/pages/Login.tsx`:
   - Import `Eye` and `EyeOff` from `lucide-react`.
   - Add a `showPassword` boolean state.
   - Wrap each password `<input>` in a relative container with an absolute-positioned button that toggles `showPassword` and switches the input `type` between `"text"` and `"password"`.
   - Apply this to both the Sign-In password field and the Sign-Up (step 1) password field.
   - Style the toggle button to sit inside the input on the right side, matching the existing dark zinc theme.

No other pages or logic are touched.