const express = require("express");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertPlayerDBObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDBObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchDBObjectToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

// GET players Details

app.get("/players/", async (request, response) => {
  const getPlayersDetails = `
    SELECT * FROM player_details;`;

  const playersDetails = await database.all(getPlayersDetails);

  response.send(
    playersDetails.map((player) =>
      convertPlayerDBObjectToResponseObject(player)
    )
  );
});

// GET player details based on playerId

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;

  const getPlayerDetails = `
    SELECT * FROM player_details WHERE player_id = ${playerId};`;

  const playerDetails = await database.get(getPlayerDetails);

  response.send(convertPlayerDBObjectToResponseObject(playerDetails));
});

// UPDATE the player details based on playerId

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerDetails = `
    UPDATE player_details 
    SET
    player_name = "${playerName}"
    WHERE player_id = ${playerId};`;

  await database.run(updatePlayerDetails);

  response.send("Player Details Updated");
});

// GET match details based on matchId

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `
    SELECT * FROM match_details WHERE match_id = ${matchId};`;

  const matchDetails = await database.get(getMatchDetails);

  response.send(convertMatchDBObjectToResponseObject(matchDetails));
});

// GET list of all the matches of a player

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayersMatch = `
    SELECT
    match_id,
    match,
    year
    FROM match_details NATURAL JOIN player_match_score
    WHERE player_id = ${playerId};`;

  const playerMatch = await database.all(getPlayersMatch);

  response.send(
    playerMatch.map((matches) => ({
      matchId: matches.match_id,
      match: matches.match,
      year: matches.year,
    }))
  );
});

// GET list of players of a specific match

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersMatches = `
    SELECT
    player_id,
    player_name
    FROM player_details NATURAL JOIN player_match_score
    WHERE match_id = ${matchId};`;

  const matches = await database.all(getPlayersMatches);

  response.send(
    matches.map((playersList) => ({
      playerId: playersList.player_id,
      playerName: playersList.player_name,
    }))
  );
});

// GET the statistics of the total score, fours, sixes of a specific player based on the player ID

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getStatisticsOfPlayer = `
    SELECT
    player_id,
    player_name,
    SUM(score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes
    FROM player_details NATURAL JOIN player_match_score
    WHERE player_id = ${playerId};`;

  const playerStatistics = await database.get(getStatisticsOfPlayer);

  response.send({
    playerId: playerStatistics.player_id,
    playerName: playerStatistics.player_name,
    totalScore: playerStatistics.totalScore,
    totalFours: playerStatistics.totalFours,
    totalSixes: playerStatistics.totalSixes,
  });
});

module.exports = app;
