const { withDB, connectRedis, redisClient, cacheKeyHomework } = require('./constant');
const express = require('express');
const router = express.Router();

connectRedis();

const updateRedisCache = async (data, expiration = 3600) => {
  try {
    await redisClient.set(cacheKeyHomework, JSON.stringify(data), { EX: expiration });
    console.log('Data cached successfully in Redis');
  } catch (err) {
    console.error('Error updating Redis cache:', err);
  }
};

// addHA route
router.post('/add', async (req, res) => {
  const { subjectID, content, assignmentDate, submissionDate} = req.body;

  try {
    await withDB(async (client) => {
      await client.query(
        'INSERT INTO hausaufgaben10d (content, subject_id, assignment_date, submission_date) VALUES ($1, $2, $3, $4)',
        [content, subjectID, assignmentDate, submissionDate]
      );
    });
    

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data);
    res.status(200).send('0');
  } catch (error) {
    console.error('Error while adding and storing hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

router.post('/checked', async (req, res)=> {
  const {ha_id, username, checkStatus} = req.body;
  
  if (checkStatus == "check"){
    try {
      await withDB(async (client) => {
        await client.query(
          'INSERT INTO homework10d_check (ha_id, username, checked) VALUES ($1, $2, TRUE)',
          [ha_id, username]
        );
      });
      const result = await withDB((client) => client.query('SELECT * FROM homework20d_check WHERE username = $1', [username]));
      const data = result.rows;
      res.status(200).send(data);
    } catch (error) {
      console.error('Error while checking hausaufgaben data:', error);
      res.status(500).send('1');
    }
  } else if (checkStatus == "uncheck"){
    try {
      await withDB(async (client) => {
        await client.query('DELETE FROM homework10d_check WHERE ha_id = $1 AND username = $2', [ha_id, username]);
      });
      const result = await withDB((client) => client.query('SELECT * FROM homework10d_check WHERE username = $1', [username]));
      const data = result.rows;
      res.status(200).send(data);
    } catch (error) {
      console.error('Error while unchecking hausaufgaben data:', error);
      res.status(500).send('2');
    }
  }
});

// deleteHA route
router.post('/delete', async (req, res) => {
  const { id } = req.body;

  try {
    await withDB(async (client) => {
      await client.query('DELETE FROM hausaufgaben10d WHERE ha_id = $1', [id]);
    });

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data, 7200); 
    res.status(200).send('0');
  } catch (error) {
    console.error('Error while deleting hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// editHA route
router.post('/edit', async (req, res) => {
  const { id, subjectID, content, assignmentDate, submissionDate} = req.body;

  try {
    await withDB(async (client) => {
      await client.query(
        'UPDATE hausaufgaben10d SET content = $1, subject_id = $2, assignment_date = $3, submission_date = $4 WHERE ha_id = $5',
        [content, subjectID, assignmentDate, submissionDate, id]
      );
    });

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data, 7200);
    res.status(200).send("0");
  } catch (error) {
    console.error('Error while editing and storing hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// fetchHA route
router.get('/fetch', async (req, res) => {
  try {
    const cachedDataHomeWork = await redisClient.get(cacheKeyHomework);

    if (cachedDataHomeWork) {
      console.log('Serving data from Redis cache');
      return res.status(200).json(JSON.parse(cachedDataHomeWork));
    }

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data, 7200);
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;
