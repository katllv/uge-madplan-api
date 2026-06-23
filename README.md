# Uge Madplan API

Backend for the Uge Madplan family meal planning app. Built with **Node.js + Express + Prisma + MySQL**.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **ORM:** Prisma
- **Database:** MySQL / MariaDB (hosted on cPanel / Nordicway.dk)
- **Language:** TypeScript
- **Auth:** JWT (single shared password)

---

## Project Structure

```
uge-madplan-api/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── lib/
│   │   └── prisma.ts          # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts            # JWT Bearer token middleware
│   ├── routes/
│   │   ├── auth.ts            # POST /api/auth/login
│   │   ├── people.ts          # /api/people
│   │   ├── ingredients.ts     # /api/ingredients
│   │   ├── recipes.ts         # /api/recipes
│   │   ├── mealPlans.ts       # /api/meal-plans
│   │   ├── pantry.ts          # /api/pantry
│   │   └── shoppingList.ts    # /api/shopping-list
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Entry point
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/katvudk_dihieu"
APP_PASSWORD="your-shared-password"
JWT_SECRET="a-long-random-string"
PORT=3000
```

Generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Set up the database

```bash
npm run db:push        # Push schema to MySQL (no migration history)
# or
npm run db:migrate     # Use Prisma migrations (recommended for production)
```

### 4. Start the dev server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## Authentication

All `POST`, `PUT`, and `DELETE` routes require a valid JWT. `GET` routes are public.

**Login:**

```http
POST /api/auth/login
Content-Type: application/json

{ "password": "your-shared-password" }
```

**Response:**

```json
{ "token": "<jwt>" }
```

**Using the token:**

Include it as a Bearer token on all mutating requests:

```http
Authorization: Bearer <jwt>
```

Tokens expire after **30 days**.

---

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Returns a JWT token |

---

### People

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/people` | List all household members |
| GET | `/api/people/:id` | Get a single person |
| POST | `/api/people` | Create a person |
| PUT | `/api/people/:id` | Update a person |
| DELETE | `/api/people/:id` | Delete a person |

**Body (POST/PUT):**

```json
{ "name": "Mia", "color": "#e07b54" }
```

---

### Ingredients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ingredients` | List all ingredients |
| GET | `/api/ingredients/search?q=` | Autocomplete search (max 20 results) |
| GET | `/api/ingredients/:id` | Get a single ingredient |
| POST | `/api/ingredients` | Create an ingredient |
| PUT | `/api/ingredients/:id` | Update an ingredient |
| DELETE | `/api/ingredients/:id` | Delete an ingredient |

**Body (POST/PUT):**

```json
{ "name": "Hakkede tomater", "unit": "dåse" }
```

---

### Recipes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recipes` | List recipes (supports filters) |
| GET | `/api/recipes/:id` | Get a single recipe |
| POST | `/api/recipes` | Create a recipe |
| PUT | `/api/recipes/:id` | Update a recipe (replaces ingredients & tags) |
| POST | `/api/recipes/:id/duplicate` | Duplicate a recipe |
| DELETE | `/api/recipes/:id` | Delete a recipe |

**Query filters (GET /api/recipes):**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by title |
| `difficulty` | 1–5 | Filter by difficulty |
| `personId` | number | Filter to recipes tagged with a person |

**Body (POST/PUT):**

```json
{
  "title": "Spaghetti bolognese",
  "instructions": "...",
  "servings": 6,
  "difficulty": 2,
  "imageUrl": null,
  "ingredients": [
    { "ingredientId": 1, "amount": "500 g" },
    { "ingredientId": 2, "amount": "2 dåser" }
  ],
  "tagPersonIds": [1, 3, 5]
}
```

**Body (POST /duplicate):** `{ "title": "Kopi-titel" }` _(optional — defaults to "original (kopi)")_

---

### Meal Plans

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meal-plans` | List all meal plans |
| GET | `/api/meal-plans/:id` | Get a meal plan by ID |
| GET | `/api/meal-plans/by-week/:startDate` | Get a meal plan by week start date (YYYY-MM-DD) |
| POST | `/api/meal-plans` | Create a meal plan |
| PUT | `/api/meal-plans/:id/days/:dayOfWeek` | Assign a recipe to a day (0=Mon … 6=Sun) |
| DELETE | `/api/meal-plans/:id` | Delete a meal plan |
| POST | `/api/meal-plans/generate` | Auto-generate a week plan |

**Body (POST):** `{ "startDate": "2024-11-04" }`

**Body (PUT /days/:dayOfWeek):** `{ "recipeId": 5 }` — pass `null` to clear the day.

**Body (POST /generate):** `{ "startDate": "2024-11-04" }`

#### Auto-generate logic

The generator shuffles all available recipes and assigns one per day (Mon–Sun). It applies a **leftover constraint**: if any person doesn't like day N's recipe, day N−1 must be a recipe they do like — so they can eat yesterday's leftovers instead. Requires at least 7 recipes in the database.

---

### Pantry

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pantry` | List everything currently at home |
| PUT | `/api/pantry/:ingredientId` | Add or update a pantry item |
| DELETE | `/api/pantry` | Clear the entire pantry |
| DELETE | `/api/pantry/:ingredientId` | Remove a pantry item |

**Body (PUT):** `{ "amount": "1 dåse" }`

---

### Shopping List

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shopping-list/:mealPlanId` | Get the shopping list for a meal plan |

Returns all ingredients needed for the week with pantry amounts noted alongside so the frontend can show what still needs to be bought.

**Response shape:**

```json
{
  "mealPlanId": 3,
  "items": [
    {
      "ingredient": { "id": 1, "name": "Hakkede tomater", "unit": "dåse" },
      "totalAmount": "2 dåser + 1 dåse",
      "pantryAmount": "1 dåse"
    }
  ]
}
```

---

## Database Schema

```
Person           — household members (name, color)
Ingredient       — canonical ingredient list (name, unit)
Recipe           — title, instructions, servings, difficulty (1–5), imageUrl
RecipeIngredient — recipe ↔ ingredient with amount
RecipeTag        — recipe ↔ person (who likes this dish)
MealPlan         — a week (unique startDate)
MealPlanDay      — day slot within a plan (0–6) with optional recipe
Pantry           — current stock (ingredient + amount)
```

---

## Deployment on cPanel

1. **Build:**
   ```bash
   npm run build
   ```
   This compiles TypeScript to `dist/`.

2. In cPanel → **Setup Node.js App**:
   - Application root: path to this repo
   - Application startup file: `dist/server.js`
   - Set all environment variables from `.env`

3. Run `npm install` and `npm run db:push` via SSH or the cPanel terminal.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled server (`node dist/server.js`) |
| `npm run db:push` | Push schema to DB without migrations |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:generate` | Re-generate Prisma client after schema changes |
