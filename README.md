# SEED GAMES

1. Flappy Bird
2. Tetris
3. Snake
4. Pong (2v2 possible?)
5. minesweeper
6. breakout
7. space invaders
8. asteroids
9. platformer (mario style)

## Logic
Each game deploys a smart contract that handles micropayments and leaderboard management. Players pay a small fee to play (0.02USDC for 20 credits - 20 atemps), which goes into a prize pool. The smart contract tracks high scores and distributes rewards to top players at regular intervals.

### Contract Notes
Owner controls:
1. fee percentage
2. cycle time
3. winner allocation (1-10 winners)

Happy path:
1. cycle time ends (back-end function),
2. Back-end sends request to contract with list of winners and percentage alocation.
3. allocates funds for claim
4. back-end resets database

Conditions on claims:
1. winners have 7 days to claim funds. After that, funds are returned to the prize pool for the next cycle.

Additional features:
1. It is possible to send funds directly to the contract to increase the prize pool.
2. Block address from participating (in case of cheating).

### Storage:
1. Firebase

### Website Design
1. Retro design (only black and white - maybe gray)
2. Initial page with title (Seed Games - seed games - SEED GAMES), games displayed in a square, name of the game, connect wallet symbol, cycle time end in days, hours, minutes
3. tab with rules
4. tab with leaderboard per game
5. tab with wallet history accomplishments
6. user permissions and window. Admin, user. Users have a tab to check their history.

### Further Additions
1. Admin has an additional window to set cycle time and winner number and fee
2. Users have an additional page to check their history
3. Past learderboards archive
4. Multiplayer modes


run command:
python3 -m http.server 8000



Order of deployment:
1. smart-contract
2. change flappyBirdContractAddress in payments.js
3. deploy database and game