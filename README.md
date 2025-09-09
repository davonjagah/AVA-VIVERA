# Value Creation Summit

A dynamic event website for the Value Creation Summit featuring business development events in Accra, Ghana.

## Features

- **Responsive Design**: Mobile-optimized layout
- **Event Showcase**: Three main events with detailed information
- **Professional Styling**: Modern glassmorphism design
- **API Ready**: RESTful API endpoints for future functionality
- **Proper Structure**: Organized Express.js project with public folder

## Events

1. **SMEs Connect: Beyond Profit - Building Legacies** (Sept 8, 2025)
2. **CEO Roundtable - Lead the Business, Scale to Legacy** (Sept 9, 2025)
3. **Wealth Creation Strategies Masterclass** (Sept 12, 2025)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd value-creation-summit
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit:
```
http://localhost:3000
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests (not configured yet)

## Project Structure

```
value-creation-summit/
├── app.js                 # Main Express application
├── package.json           # Project dependencies and scripts
├── .gitignore            # Git ignore file
├── README.md             # Project documentation
├── public/               # Static assets
│   ├── css/
│   │   └── styles.css    # CSS styles
│   ├── images/           # Image assets
│   │   ├── logo.png
│   │   ├── vivera.png
│   │   ├── sme.jpeg
│   │   ├── ceo.jpg
│   │   └── wealth.jpeg
│   └── js/               # JavaScript files (future)
├── views/                # HTML templates
│   └── index.html        # Main HTML file
├── routes/               # Route handlers
│   ├── index.js          # Main page routes
│   └── api.js            # API routes
└── controllers/          # Business logic (future)
```

## API Endpoints

- `GET /` - Main website
- `GET /api/events` - Returns JSON data of all events
- `GET /api/events/:id` - Returns specific event by ID

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3
- **Development**: Nodemon for auto-reload
- **Architecture**: MVC pattern with proper folder structure

## Contact

For more information about the Value Creation Summit:
- Email: valuecreationsummit@accessviewafrica.com
- Phone: 0240509803

## License

MIT License # AVA-VIVERA
# Updated Tue Sep  9 17:26:54 WAT 2025
