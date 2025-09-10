## Controller: `increasePositionsByShelfAndDivision`

### Purpose
Shift sample positions within a shelf and division to make space for a new entry.  
All samples at or after a given position are incremented by **+1**.

---

### Route
`PATCH /api/samples/increase-positions-by-shelf-division`

---

### Main Logic
1. Validate user team with `getUserTeam`.
2. Ensure `shelf`, `division`, and `currentPosition` are numbers.
3. Query matching samples:
   ```js
   {
     shelf,
     division,
     team: team.team_name,
     availability: "yes",
     position: { $gte: currentPosition }
   }
Update:

js
Copy code
samplesCollection.updateMany(query, { $inc: { position: 1 } });