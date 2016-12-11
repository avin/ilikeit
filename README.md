# iLikeIt

## Install and run
install `phantomjs` before
```
yarn
yarn run start
```

## Configuration
Edit `config.js`

## Cron job
example task
```
0 * * * * cd /utils/ilikeit/ &&  PHANTOMJS_EXECUTABLE=/usr/local/bin/phantomjs /usr/bin/yarn run start
```
