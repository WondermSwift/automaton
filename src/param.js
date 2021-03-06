import Interpolator from "./interpolator";

let cloneObj = ( _obj ) => {
	if ( typeof _obj !== "object" ) { return _obj; }
	let obj = {};
	for ( let key in _obj ) {
		obj[ key ] = _obj[ key ];
	}
	return obj;
}

let AutomatonParam = class {
	constructor( _automaton ) {
		let param = this;
		param.automaton = _automaton;

		param.values = [];
		let arrayLength = Math.ceil( param.automaton.resolution * param.automaton.length ) + 1;
		for ( let i = 0; i < arrayLength; i ++ ) {
			param.values[ i ] = 0.0;
		}
		param.nodes = [];

		if ( false ) {
		} else {
			param.addNode( 0.0, 0.0 );
			param.addNode( param.automaton.length, 1.0 );
		}

		param.render();
	}

	load( _data ) {
		let param = this;

		param.nodes = _data;

		param.render();
	}

	sortNodes() {
		let param = this;

		param.nodes.sort( ( a, b ) => a.time - b.time );
	}

	render( _index ) {
		let param = this;

		param.values = [];

		for ( let i = 1; i < param.nodes.length; i ++ ) {
			let startt = param.nodes[ i - 1 ].time;
			let starti = Math.floor( startt * param.automaton.resolution );

			let endt = param.nodes[ i ].time;
			let endi = Math.floor( endt * param.automaton.resolution );

			let reset = i === 1 || param.nodes[ i ].mods[ Interpolator.MOD_RESET ];
			let resetVel = param.nodes[ i ].mods[ Interpolator.MOD_RESET ] ? param.nodes[ i ].mods[ Interpolator.MOD_RESET ].velocity : 0.0;
			let deltaTime = 1.0 / param.automaton.resolution;

			let iparam = {
				mode: param.nodes[ i ].mode,
				start: reset ? param.nodes[ i - 1 ].value : param.values[ starti ],
				end: param.nodes[ i ].value,
				deltaTime: deltaTime,
				length: endi - starti + 1,
				vel: ( !reset && 2 < param.values.length ) ? ( param.values[ param.values.length - 1 ] - param.values[ param.values.length - 2 ] ) / deltaTime : resetVel,
				mods: param.nodes[ i ].mods
			};
			for ( let key in param.nodes[ i ].params ) {
				iparam[ key ] = param.nodes[ i ].params[ key ];
			}

			let arr = Interpolator.generate( iparam );
			param.values.pop();

			param.values = param.values.concat( arr );
		}
	}

	addNode( _time, _value ) {
		let param = this;

		let next = param.nodes.filter( node => _time < node.time )[ 0 ];
		if ( !next ) {
			next = {
				mode: Interpolator.MODE_LINEAR,
				params: {},
				mods: []
			};
			for ( let i = 0; i < Interpolator.MODS; i ++ ) {
				next.mods[ i ] = false;
			}
		}

		let node = {
			time: _time,
			value: _value,
			mode: next.mode,
			params: cloneObj( next.params ),
			mods: next.mods.map( _obj => cloneObj( _obj ) )
		};
		param.nodes.push( node );

		param.sortNodes();
		param.render();

		return node;
	}

	setTime( _index, _time ) {
		let param = this;

		if ( _index < 0 || param.nodes.length <= _index ) { return; }

		if ( _index !== 0 && param.nodes.length - 1 !== _index ) {
			param.nodes[ _index ].time = Math.min(
				Math.max(
					_time,
					param.nodes[ _index - 1 ].time + 1.0 / param.automaton.resolution
				),
				param.nodes[ _index + 1 ].time - 1.0 / param.automaton.resolution
			);
			param.render();
		}

		return param.nodes[ _index ].time;
	}

	setValue( _index, _value ) {
		let param = this;

		if ( _index < 0 || param.nodes.length <= _index ) { return; }

		param.nodes[ _index ].value = _value;

		param.render();

		return param.nodes[ _index ].value;
	}

	setMode( _index, _mode ) {
		let param = this;

		if ( _index < 1 || param.nodes.length <= _index ) { return; }

		let node = param.nodes[ _index ];
		node.mode = _mode;
		if ( _mode === Interpolator.MODE_HOLD ) {
			node.params = {};
		} else if ( _mode === Interpolator.MODE_LINEAR ) {
			node.params = {};
		} else if ( _mode === Interpolator.MODE_SMOOTH ) {
			node.params = {};
		} else if ( _mode === Interpolator.MODE_EXP ) {
			node.params = {
				factor: 10.0
			};
		} else if ( _mode === Interpolator.MODE_SPRING ) {
			node.params = {
				rate: 500.0,
				damp: 1.0
			};
		} else if ( _mode === Interpolator.MODE_GRAVITY ) {
			node.params = {
				gravity: 70.0,
				bounce: 0.3
			};
		}

		param.render();
	}

	setParams( _index, _params ) {
		let param = this;

		if ( _index < 0 || param.nodes.length <= _index ) { return; }

		for ( let key in _params ) {
			param.nodes[ _index ].params[ key ] = _params[ key ];
		}

		param.render();
	}

	activeModParams( _index, _mod, _active ) {
		let param = this;

		if ( _index < 0 || param.nodes.length <= _index ) { return; }
		if ( _mod < 0 || Interpolator.MODS <= _mod ) { return; }

		if ( _active ) {
			param.nodes[ _index ].mods[ _mod ] = {};

			let params;
			if ( _mod === Interpolator.MOD_RESET ) {
				params = {
					velocity: 0.0
				};
			} else if ( _mod === Interpolator.MOD_SIN ) {
				params = {
					freq: 5.0,
					amp: 0.1,
					phase: 0.0
				};
			} else if ( _mod === Interpolator.MOD_NOISE ) {
				params = {
					freq: 1.0,
					amp: 0.2,
					reso: 8.0,
					recursion: 4.0,
					seed: 1.0
				};
			} else if ( _mod === Interpolator.MOD_LOFI ) {
				params = {
					freq: 10.0
				};
			}
			param.setModParams( _index, _mod, params );
		} else {
			param.nodes[ _index ].mods[ _mod ] = false;
		}
	}

	setModParams( _index, _mod, _params ) {
		let param = this;

		if ( _index < 0 || param.nodes.length <= _index ) { return; }
		if ( _mod < 0 || Interpolator.MODS <= _mod ) { return; }

		for ( let key in _params ) {
			param.nodes[ _index ].mods[ _mod ][ key ] = _params[ key ];
		}

		param.render();
	}

	removeNode( _index ) {
		let param = this;

		if ( _index < 1 || param.nodes.length - 1 <= _index ) { return; }

		let node = param.nodes.splice( _index, 1 );

		param.render();

		return node;
	}

	getValue( _time ) {
		let param = this;

		let time = typeof _time === "number" ? _time : param.automaton.time;
		time = time % param.automaton.length;

		let index = time * param.automaton.resolution;
		let indexi = Math.floor( index );
		let indexf = index % 1.0;

		let pv = param.values[ indexi ];
		let fv = param.values[ indexi + 1 ];

		return pv + ( fv - pv ) * indexf;
	}
};

// ------

export default AutomatonParam;