// 1. Wait for the onload even
   window.addEventListener("load",function() { 
 
var Q = window.Q = Quintus({ development: true })
          .include("Sprites, Scenes, Input, 2D")
          .setup({ width: 640, height: 480 });

      // Adding in the default keyboard controls
     
      Q.input.keyboardControls();
      Q.input.joypadControls();

      Q.gravityX = 0;
      Q.gravityY = 0;

      var SPRITE_PLAYER = 1;
      var SPRITE_TILES = 2;
      var SPRITE_ENEMY = 4;
      var SPRITE_DOT = 8;
      
  

      Q.component("towerManControls", {
        
        defaults: { speed: 100, direction: 'up' },

        // called when the component is added to
        // an entity
        added: function() {
          var p = this.entity.p;

          // add in our default properties
          Q._defaults(p,this.defaults);

          // every time our entity steps
          // call our step method
          this.entity.on("step",this,"step");
        },

        step: function(dt) {
          // grab the entity's properties
          // for easy reference
          var p = this.entity.p;

          // rotate the player
          // based on our velocity
          if(p.vx > 0) {
            p.angle = 90;
          } else if(p.vx < 0) {
            p.angle = -90;
          } else if(p.vy > 0) {
            p.angle = 180;
          } else if(p.vy < 0) {
            p.angle = 0;
          }

          // grab a direction from the input
          p.direction = Q.inputs['left']  ? 'left' :
                        Q.inputs['right'] ? 'right' :
                        Q.inputs['up']    ? 'up' :
                        Q.inputs['down']  ? 'down' : p.direction;

          // based on our direction, try to add velocity
          // in that direction
          switch(p.direction) {
            case "left": p.vx = -p.speed; break;
            case "right":p.vx = p.speed; break;
            case "up":   p.vy = -p.speed; break;
            case "down": p.vy = p.speed; break;
          }
        }
      });


      Q.Sprite.extend("Player", {
        init: function(p) {

          this._super(p,{
            sheet:"player",
            type: SPRITE_PLAYER,
            collisionMask: SPRITE_TILES | SPRITE_ENEMY | SPRITE_DOT
          });

          this.add("2d, towerManControls");
        }
      });


      // Create the Dot sprite
      Q.Sprite.extend("Dot", {
        init: function(p) {
          this._super(p,{
            sheet: 'dot',
            type: SPRITE_DOT,
            // Set sensor to true so that it gets notified when it's
            // hit, but doesn't trigger collisions itself that cause
            // the player to stop or change direction
            sensor: true
          });

          this.on("sensor");
          this.on("inserted");
        },

        // When a dot is hit
        sensor: function() {
          // Destroy it 
          this.destroy();
          this.stage.dotCount--;
          // If there are no more dots left
          if(this.stage.dotCount == 0) {
            Q.stageScene("level1");
          }
        },

        // When a dot is inserted, use it's parent (the stage)
        // to keep track of the total number of dots on the stage
        inserted: function() {
          this.stage.dotCount = this.stage.dotCount || 0
          this.stage.dotCount++;
        }
      });


      // Tower is just a dot with a different sheet - use the same
      // sensor and counting functionality
      Q.Dot.extend("Tower", {
        init: function(p) {
          this._super(Q._defaults(p,{
            sheet: 'tower'
          }));
        }
      });

      // Return a x and y location from a row and column
      // in our tile map
      Q.tilePos = function(col,row) {
        return { x: col*32 + 16, y: row*32 + 16 };
      }

      Q.TileLayer.extend("TowerManMap",{
        init: function() {
          this._super({
            type: SPRITE_TILES,
            dataAsset: 'level.JSON',
            sheet:     'tiles',
          });

        },
        
        setup: function() {
          // indefinite loops over the level map, it ensure all tiles, sprites, honey are where they should be.
          var tiles = this.p.tiles = this.p.tiles.concat();
          var size = this.p.tileW;
          for(var y=0;y<tiles.length;y++) {
            var row = tiles[y] = tiles[y].concat();
            for(var x =0;x<row.length;x++) {
              var tile = row[x];

              if(tile == 0 || tile == 2) {
                var className = tile == 0 ? 'Dot' : 'Tower'
                this.stage.insert(new Q[className](Q.tilePos(x,y)));
                row[x] = 0;
              }
            }
          }
        }

      });

      Q.component("enemyControls", {
        defaults: { speed: 100, direction: 'left', switchPercent: 2 },

        added: function() {
          var p = this.entity.p;

          Q._defaults(p,this.defaults);

          this.entity.on("step",this,"step");
          this.entity.on('hit',this,"changeDirection");
        },
		
        step: function(dt) {
		// 50/50 chance they will change direction of the AI
          var p = this.entity.p;

          if(Math.random() < p.switchPercent / 100) {
            this.tryDirection();
          }

          switch(p.direction) {
            case "left": p.vx = -p.speed; break;
            case "right":p.vx = p.speed; break;
            case "up":   p.vy = -p.speed; break;
            case "down": p.vy = p.speed; break;
          }
        },

        tryDirection: function() {
		// decides if the AI can turn left or right, up or down.
          var p = this.entity.p; 
          var from = p.direction;
          if(p.vy != 0 && p.vx == 0) {
            p.direction = Math.random() < 0.5 ? 'left' : 'right';
          } else if(p.vx != 0 && p.vy == 0) {
            p.direction = Math.random() < 0.5 ? 'up' : 'down';
          }
        },

        changeDirection: function(collision) {
		// changes the direction of the AI if they colide with wall
          var p = this.entity.p;
          if(p.vx == 0 && p.vy == 0) {
            if(collision.normalY) {
              p.direction = Math.random() < 0.5 ? 'left' : 'right';
            } else if(collision.normalX) {
              p.direction = Math.random() < 0.5 ? 'up' : 'down';
            }
          }
        }
      });


      Q.Sprite.extend("Enemy", {
	  // loads the enemy sprite off the sprite sheet and allows it to collide with enemy and tiles
        init: function(p) {

          this._super(p,{
            sheet:"enemy",
            type: SPRITE_ENEMY,
            collisionMask: SPRITE_PLAYER | SPRITE_TILES
          });
		// event listener to check if players hit the enemy
          this.add("2d,enemyControls");
          this.on("hit.sprite",this,"hit");
        },

        hit: function(col) {
		// restarts game if player is hit
          if(col.obj.isA("Player")) {
            Q.stageScene("level1");
          }
        }
      });

      Q.scene("level1",function(stage) {
	  // creates the game and loads sprites, tiles and the level design required for the game to function.
        var map = stage.collisionLayer(new Q.TowerManMap());
        map.setup();

        stage.insert(new Q.Player(Q.tilePos(10,7)));

        stage.insert(new Q.Enemy(Q.tilePos(10,4)));
        stage.insert(new Q.Enemy(Q.tilePos(15,10)));
        stage.insert(new Q.Enemy(Q.tilePos(5,10)));
      });

      Q.load("sprites.png, sprites.json, level.JSON, tiles.png", function() {
        Q.sheet("tiles","tiles.png", { tileW: 32, tileH: 32 });

        Q.compileSheets("sprites.png","sprites.json");

        Q.stageScene("level1");
      });

    });
