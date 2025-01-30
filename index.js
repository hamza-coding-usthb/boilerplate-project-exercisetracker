const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
app.use(express.json()); // ✅ Parse JSON requests
app.use(express.urlencoded({ extended: true })); // ✅ Parse form data

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/exercise-tracker", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const newUser = new User({ username });
    await newUser.save();

    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// handle new exercises
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "_id username"); // Get all users
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    if (!description || !duration) {
      return res.status(400).json({ error: "Description and duration are required" });
    }

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    await newExercise.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let query = { userId: _id };

    // Apply date filters if present
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    // Fetch exercises with optional limit
    let exercises = Exercise.find(query).select("description duration date -_id");
    if (limit) exercises = exercises.limit(parseInt(limit));

    exercises = await exercises.exec();

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
