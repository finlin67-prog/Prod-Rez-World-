# Career Theme Park 🎢

An interactive, Disney-inspired visualization of your professional journey using Next.js 14, Mapbox GL JS, and real career data.

## 🎯 Features

### Interactive Map
- **Full-screen Mapbox visualization** with custom styling (dark theme)
- **Zone polygons** representing different career areas (ABM Kingdom, RevOps Forge, MarTech Mountain, etc.)
- **Attraction markers** showing individual roles/positions
- **Two-layer attraction system**:
  - **Dim layer**: All filtered roles (blue circles, lower opacity)
  - **Highlight layer**: Roles matching the current year from the timeline slider (gold circles, brighter glow)

### Filters & Controls

#### Left Sidebar
1. **Skills Filter**: Multi-select chips from your skills inventory
2. **Industries Filter**: Multi-select chips from industries extracted from GeoJSON
3. **Seniority Filter**: Dropdown to filter by role level (Manager, Director, Leader)
4. **Career Timeline Slider**: Interactive year slider (2003-2025) that highlights roles by their end year

#### Top Navigation Bar
- Toggle between views: **Roles** | Skills | Projects | Certifications
- Disney-inspired gradient background (purple-pink-red)

### Data Architecture

#### Data Files (`/public/data/`)
1. **`career-world.geojson`**: 
   - FeatureCollection with zones (polygons) and roles (points)
   - Properties: kind, name, title, company, years, zoneId, skills, industries, summary
   
2. **`roles.json`**:
   - Array of role objects with detailed information
   - Properties: id, attractionId, title, company, location, startYear, endYear, zoneIds, summary, highlights, skills, tools, metrics, seniority

3. **`roles_full.json`**:
   - Extended role details keyed by role ID
   - Properties: longSummary, responsibilities[], bullets[]

4. **`skills.json`**:
   - Skills inventory with id and label
   - Used for filter chips and skill badges

#### In-Memory Indexes
- `roleByAttractionId`: Map from attractionId to role object
- `fullRoleById`: Map from role.id to full role details
- `skillsIndex`: Map from skill.id to skill object with label
- `industries`: Array of unique industries from GeoJSON

### Interactive Elements

#### Attraction Click Handler
When you click a marker:
1. **Popup appears** with Disney-style card showing:
   - Role title
   - Company name
   - Years active
   - Top 3 skills as tags

2. **Map animation**: Smooth fly-to animation centering on the clicked location

3. **Right sidebar opens** with detailed role information:
   - Summary
   - Highlights (with award icons)
   - Skills (as badges)
   - Tools
   - "View Full Experience" button (if detailed data available)

#### Full Experience Modal
- Opens when clicking "View Full Experience"
- Displays:
  - Long summary
  - Responsibilities list
  - Key achievements with bullet points
- Scrollable content area for long content

### Filtering Logic

The application computes two sets of attraction IDs:

1. **`allowedAttractionIds`**: Roles that pass all filter criteria
   - Skills: Must have at least one selected skill (if any selected)
   - Industries: Must belong to at least one selected industry (if any selected)
   - Seniority: Must match selected level (if not "all")
   - Year: Must have ended on or before the current timeline year

2. **`highlightAttractionIds`**: Subset of allowed roles where:
   - `endYear === currentYear` OR
   - `!endYear && startYear === currentYear`

These IDs are used to update Mapbox layer filters dynamically.

### Map Layers

1. **`zones`**: Fill layer for career zone polygons (color-coded by theme)
2. **`zones-border`**: Line layer for zone boundaries
3. **`zones-labels`**: Symbol layer for zone names
4. **`attractions-dim`**: Circle layer for filtered roles (not highlighted)
5. **`attractions-highlight`**: Circle layer for current-year roles
6. **`attractions-labels`**: Symbol layer showing company names for visible attractions

### Visual Design

- **Color Scheme**: Dark theme with vibrant accent colors
  - Zones: Theme-based colors (green, purple, amber, blue, pink, red)
  - Dim attractions: Blue (#60a5fa)
  - Highlighted attractions: Gold (#fbbf24)
  
- **Typography**: System fonts with bold headings and readable body text

- **Animations**: 
  - Sidebar slide-in animations (Framer Motion)
  - Map fly-to transitions
  - Smooth filter updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn package manager
- Mapbox API token

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

3. Add your Mapbox token to `.env`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   ```

4. Place your data files in `/public/data/`:
   - `career-world.geojson`
   - `roles.json`
   - `roles_full.json`
   - `skills.json`

5. Run the development server:
   ```bash
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## 📦 Dependencies

### Core
- `next@14.2.3`: React framework with App Router
- `react@18` & `react-dom@18`: UI library
- `mapbox-gl@3.16.0`: Interactive maps
- `framer-motion@12.23.24`: Animation library

### UI Components (shadcn/ui)
- `@radix-ui/*`: Accessible component primitives
- `lucide-react`: Icon library
- `tailwindcss`: Utility-first CSS

## 🎨 Customization

### Changing Map Style
Edit the Mapbox style in `/app/page.js`:
```javascript
style: 'mapbox://styles/mapbox/dark-v11'
```

Options: `dark-v11`, `light-v11`, `streets-v12`, `outdoors-v12`, `satellite-v9`

### Adjusting Zone Colors
Modify the `fill-color` match expression in the `zones` layer:
```javascript
'fill-color': [
  'match',
  ['get', 'theme'],
  'growth', '#10b981',      // green
  'martech', '#8b5cf6',     // purple
  'demand-gen', '#f59e0b',  // amber
  // ... add more themes
]
```

### Modifying Filter Behavior
Edit filter logic in the `useEffect` hook that watches:
- `selectedSkills`
- `selectedIndustries`
- `selectedSeniority`
- `currentYear`

## 🐛 Troubleshooting

### Map not loading
- Check that `NEXT_PUBLIC_MAPBOX_TOKEN` is set in `.env`
- Verify the token is valid and has the correct scopes
- Check browser console for Mapbox errors

### Attractions not appearing
- Verify data files are in `/public/data/`
- Check that feature IDs in `career-world.geojson` match `attractionId` or `id` in `roles.json`
- Open browser console and look for "No role found for feature" messages

### Filters not working
- Ensure `skills` array in `roles.json` uses skill IDs from `skills.json`
- Verify `industries` in GeoJSON match `selectedIndustries` array
- Check that `seniority` field in `roles.json` is lowercase

## 📝 Data Structure Reference

### GeoJSON Feature (Role)
```json
{
  "type": "Feature",
  "id": "prgx-digital-abm",
  "properties": {
    "kind": "role",
    "name": "PRGX Digital ABM Launchpad",
    "title": "Director of Digital Marketing & ABM",
    "company": "PRGX Global",
    "years": "2024–2025",
    "zoneId": "abm-kingdom",
    "skills": ["ABM", "Digital Marketing"],
    "industries": ["Audit & Recovery", "Analytics"],
    "summary": "..."
  },
  "geometry": {
    "type": "Point",
    "coordinates": [50, 15]
  }
}
```

### Role Object (roles.json)
```json
{
  "id": "prgx-digital-abm",
  "attractionId": "prgx-digital-abm",
  "title": "Director of Digital Marketing & ABM",
  "company": "PRGX Global Inc.",
  "startYear": 2024,
  "endYear": 2025,
  "skills": ["abm-strategy", "digital-demand-gen"],
  "tools": ["demandbase", "salesforce-crm"],
  "seniority": "director",
  "summary": "...",
  "highlights": ["..."]
}
```

### Full Role Details (roles_full.json)
```json
{
  "prgx-digital-abm": {
    "longSummary": "...",
    "responsibilities": ["...", "..."],
    "bullets": ["...", "..."]
  }
}
```

### Skill Object (skills.json)
```json
{
  "skills": [
    {
      "id": "abm-strategy",
      "label": "Account-Based Marketing Strategy"
    }
  ]
}
```

## 🎭 Theme Park Zones

1. **Onboarding Forest** (Green) - Early career, training, learning
2. **MarTech Mountain** (Purple) - Marketing technology and tools
3. **Demand Gen Fields** (Amber) - Demand generation and campaigns
4. **RevOps Forge** (Blue) - Revenue operations and analytics
5. **ABM Kingdom** (Pink) - Account-based marketing expertise
6. **GTMstack Citadel** (Red) - Go-to-market architecture

---

Built with ❤️ using Next.js, Mapbox, and career data
