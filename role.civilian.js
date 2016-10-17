let tasks = require('tasks');
let respawn = require('respawn');

module.exports = {
	builderTarget : function(room,numCivs){
		var progLeft = _.sum(room.find(FIND_MY_CONSTRUCTION_SITES), (cs) => cs.progressTotal - cs.progress);
		var energyPerCiv = respawn.bodies.civilian(room.energyCapacityAvailable).length * 50 / 3;
		var buildersNeeded = Math.ceil(progLeft/energyPerCiv); //if no spawn, will return Infinity, but Math.min can handle that
		var numBuilders = Math.min(buildersNeeded,numCivs);
		if(numBuilders == 0){ //if there are walls to be repaired, should have one builder even if no construction site
			var lowWalls = room.find(FIND_STRUCTURES,
				{filter : (s) => (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < room.memory.wallMax
			});
			if(lowWalls.length){
				numBuilders = 1;
			}
		}
		return numBuilders
	},
	run : function(creep){
		//preparing
		if(creep.memory.ontask && creep.carry.energy == 0){
			creep.memory.ontask = false;
            creep.say('getting');
		}
		if(!creep.memory.ontask && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.ontask = true;
			creep.memory.mytask = ' ' //remove current task so own task is not counted in the following
			var civs = creep.room.find(FIND_MY_CREEPS,{filter : (c) => c.memory.role == 'civilian'});
			var civsByTask = _.groupBy(civs,'memory.mytask');
			var numBuilders = civsByTask.builder != undefined ? civsByTask.builder.length : 0;
			// var numUpgraders= civsByTask.upgrader != undefined ? civsByTask.upgrader.length : 0;
			var emergencies = creep.room.find(FIND_FLAGS,{filter: (f) => /emergency/.test(f.name)}).length
			if(emergencies > 0){
				creep.memory.mytask = 'panic';
				creep.say('panic',true);
			}
			else{
				if(numBuilders < this.builderTarget(creep.room,civs.length) ){
					creep.memory.mytask = 'builder';
					creep.say('building');
				}
				else{
					creep.memory.mytask = 'upgrader';
					creep.say('upgrading');
				}
			}
	    }
		//doing stuff
		if(creep.memory.ontask && creep.memory.mytask == 'builder'){
			var targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
			var lowWalls = creep.room.find(FIND_STRUCTURES,
				{filter : (s) => (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < creep.room.memory.wallMax
			});
			if(targets.length){
				tasks.construct(creep,targets[0]);
			}
			else if(lowWalls.length){
				tasks.repWall(creep);
			}
			else{
				creep.memory.ontask = false //switch back to getting if there is nothing left to build
				creep.say('nevermind');
			}
		}
		else if(creep.memory.ontask && creep.memory.mytask == 'upgrader'){
			if(creep.upgradeController(creep.room.controller)==ERR_NOT_IN_RANGE){
	            creep.moveTo(creep.room.controller);
	        }
		}
		else if(creep.memory.ontask && creep.memory.mytask == 'panic'){
			var emergencyFlags = creep.room.find(FIND_FLAGS,{filter: (f) => /emergency/.test(f.name)});
			var numFlags = emergencyFlags.length;
			var target = undefined
			for(i=1 ; i<=numFlags ; i++){
	            var myFlag = 'emergency' + i;
	            var rampart = _.filter(Game.flags[myFlag].pos.lookFor(LOOK_STRUCTURES),
					{filter : (s) => s.structureType == STRUCTURE_RAMPART && s.hits < 6000000}
				);
	            if(rampart.length > 0){
	                target = rampart[0];
	                break;
	            }
	        }
			if(target != undefined){
				if(creep.repair(target) == ERR_NOT_IN_RANGE){
					creep.moveTo(target);
				}
				else{
					creep.moveTo(target);
				}
			}
		}
		else if(creep.ticksToLive < 100){
			creep.memory.role = 'recycler';
		}
        else{ //get energy in priority: dropped, container, storage, harvest
			var sources = creep.room.find(FIND_SOURCES);
			var mysource = sources[1];
			tasks.getenergy(creep,mysource);
	    }
	}
}
