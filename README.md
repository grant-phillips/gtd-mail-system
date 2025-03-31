# GTD Mail System - Classification UI

This package provides React components for the email classification interface of the GTD Mail System.

## Features

- Folder navigation sidebar with GTD categories
- Email list views filtered by category
- Drag-and-drop email categorization
- Priority indicators and visual cues
- Quick action buttons
- Responsive design for mobile and desktop
- Loading states and error handling

## Installation

```bash
npm install @gtd-mail/classification-ui
```

## Usage

```tsx
import { ClassificationView } from '@gtd-mail/classification-ui';

function App() {
  return (
    <div className="h-screen">
      <ClassificationView />
    </div>
  );
}
```

## Components

### ClassificationView

The main component that combines the sidebar and email list. It handles the responsive layout and mobile navigation.

### FolderSidebar

A navigation component that displays GTD categories with email counts. It supports:
- Category selection
- Visual indicators for selected category
- Email count badges
- Mobile-friendly design

### EmailList

Displays emails in the selected category with:
- Drag-and-drop support for categorization
- Priority indicators
- Quick action buttons
- Loading and empty states
- Error handling

## Styling

The components use Tailwind CSS for styling. Make sure to include Tailwind CSS in your project:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure your `tailwind.config.js`:

```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@gtd-mail/classification-ui/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      }
    }
  },
  plugins: []
}
```

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT
 
