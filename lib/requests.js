/** 
 * Purpose: Request construction library for interacting with Minerva.
 * 
 * This module includes the following objects:
 *  - request_variable
 *  - request
 *  - request_set
 * 
 * @module minerva-requests
 */

var us = require('underscore');
var each = us.each;
var bbop = require('bbop-core');
var what_is = bbop.what_is;
var uuid = bbop.uuid;
var class_expression = require('class-expression');

/**
 * Contructor for a request variable, used to relate references during
 * a request.
 * 
 * Internal usage variable for keeping track of implicit
 * assignToVariable on the client (see Minerva).
 * 
 * @constructor
 * @param {String} [varvalue] - string representing a future variable value
 * @returns {request_variable} request variable object
 */
var request_variable = function(varvalue){
    var anchor = this;
    anchor._is_a = 'minerva-requests.request_variable';

    anchor._var = uuid(); // primo
    anchor._use_var_p = false;

    function _value(value){
	if( value ){
	    anchor._var = value;
	    anchor._use_var_p = true;
	}
	return anchor._var;
    }
    // Do an initial revalue depending on the constructor's incoming
    // arguments.
    _value(varvalue);

    /**
     * The value of the variable to be used.
     *
     * @name value
     * @function
     * @returns {String} string
     */
    anchor.value = _value;

    /**
     * Returns true or false on whether or not the user changed the
     * value of the setting.
     *
     * @name set_p
     * @function
     * @returns {Boolean} boolean
     */
    anchor.set_p = function(){
	return anchor._use_var_p;
    };
};

/**
 * Contructor for a Minerva request item. See table for
 * operation/entity combinations:
 * https://github.com/berkeleybop/bbopx-js/wiki/MinervaRequestAPI .
 * 
 * Handle requests to Minerva in a somewhat structured way.
 * 
 * @constructor
 * @param {String} entity - string, see table
 * @param {String} operation - string, see table
 * @returns {request} request object
 */
var request = function(entity, operation){
    var anchor = this;
    anchor._is_a = 'minerva-requests.request';

    // Minerva entity to make a call against.
    anchor._entity = entity;

    // Minerva operation to perform on entity.
    anchor._operation = operation;

    // Almost all non-meta operations require a model id. However,
    // this is sometimes implied in the case of new model creation.
    anchor._model_id = null;

    // Tons of ops require individuals, and they need to be implicitly
    // passable.
    anchor._individual_id = new request_variable();

    // Hold most other additional arguments to the request.
    // TODO: Could use some checking here? Maybe per-entity?
    // Could possibly explore using swagger or json-schema?
    anchor._arguments = {};

    ///
    /// Internal helper functions.
    ///

    // Our list of values must be defined if we go this way.
    anchor._ensure_list = function(key){
	if( ! anchor._arguments[key] ){
	    anchor._arguments[key] = [];
	}
    };

    // Add generic property (non-list).
    anchor._add = function(key, val){
	anchor._arguments[key] = val;
	return anchor._arguments[key];
    };

    // Get generic property (non-list).
    anchor._get = function(key){
	var ret = null;
	var t = anchor._arguments[key];
	if( t != null ){
	    ret = t;
	}
	return ret;
    };

    // Getter/setter (non-list).
    anchor._get_set = function(key, variable){
	if( variable ){
	    anchor._add(key, variable);
	}
	return anchor._get(key);
    };

    ///
    /// Public API.
    ///

    /**
     * The specified entity string.
     *
     * @returns {String|null} string or null
     */
    anchor.entity = function(){
	return anchor._entity;
    };

    /**
     * Add a "special" variable to the request. For a subset of
     * requests, this may be required. See table:
     * https://github.com/berkeleybop/bbopx-js/wiki/MinervaRequestAPI .
     *
     * @name special
     * @function
     * @param {String} name - string
     * @param {String} val - string
     * @returns {String} added value
     */
    anchor.special = function(name, val){
	return anchor._get_set(name, val);
    };

    /**
     * Should only be used in the context of making a request set.
     *
     * Return a higher-level representation/"serialization" of the
     * complete object.
     *
     * @name objectify
     * @function
     * @returns {Object} simple object
     */
    anchor.objectify = function(){

	// Things we will always return.
	var base = {
	    'entity': anchor._entity,
	    'operation': anchor._operation,
	    'arguments': anchor._arguments
	};

	// If we're using an implicitly set individual id, make sure
	// that is added to the call.
	if( anchor._entity == 'individual' && ! anchor._individual_id.set_p() ){
	    base['arguments']['assign-to-variable'] =
		anchor._individual_id.value();
	}

	return base;
    };

    /**
     * Get/set the instance of this request. If not set explicitly,
     * will fall back to a default value.
     *
     * @name individual
     * @function
     * @param {String} [ind_id] - individual id we're going to refer to
     * @returns {String} string
     */
    anchor.individual = function(ind_id){
	if( ind_id ){
	    anchor._individual_id.value(ind_id);
	    anchor._add('individual', ind_id);
	}else{
	    // Fallback to using anonymous one (no change to default).
	}
	//anchor._add('individual', anchor._individual_id.value());
	return anchor._individual_id.value();
    };

    /**
     * Get/set the subject of this request.
     *
     * @param {String} [sub] - string
     * @returns {String|null} string or null
     */
    anchor.subject = function(sub){
	return anchor._get_set('subject', sub);
    };

    /**
     * Get/set the object of this request. This will be used in
     * fact/edge requests, but not much else.
     *
     * @name object
     * @function
     * @param {String} [obj] - a string
     * @returns {String|null} string or null
     */
    anchor.object = function(obj){
	return anchor._get_set('object', obj);
    };

    /**
     * Get/set the predicate of this request. This will be used in
     * fact/edge requests, but not much else.
     *
     * @name predicate
     * @function
     * @param {String} [pred] - a string
     * @returns {String|null} string or null
     */
    anchor.predicate = function(pred){
	return anchor._get_set('predicate', pred);
    };

    /**
     * Get/set the topic model of this request.
     *
     * If a model is not set, like during requests in a set to a
     * not-yet-created model, Minerva will often add this itself if it
     * can after the fact.
     *
     * @name model
     * @function
     * @param {String} [model] - a string id
     * @returns {String|null} string or null
     */
    anchor.model = function(model){
	return anchor._get_set('model-id', model);
    };
    
    /**
     * Add a fact to the request. The same as adding subject, object,
     * and predicate all separately.
     *
     * @name fact
     * @function
     * @param {String} sub - string
     * @param {String} obj - string
     * @param {String} pred - string
     * @returns {} n/a
     */
    anchor.fact = function(sub, obj, pred){
	// Update the request's internal variables.
	anchor.subject(sub);
	anchor.object(obj);
	anchor.predicate(pred);
    };

    /**
     * Add an annotation pair (or series of pairs) to the request.
     * All annotations should be converted into strings for upstream consumption.
     *
     * @name add_annotation
     * @function
     * @param {String} key - string
     * @param {String} vals - string or list of strings
     * @returns {Number} number of annotations
     */
    anchor.add_annotation = function(key, vals){

	// Convert val to a list if necessary.
	if( what_is(vals) == 'string' || what_is(vals) == 'number' ){
	    vals = [vals];
	}
	if( what_is(vals) != 'array' ){ throw new Error('unknown argument'); }

	// Our list of values must be defined if we go this way.
	anchor._ensure_list('values');

	// Add all of the incoming values.
	each(vals, function(val){
	    // Numbers to strings.
	    var final_val = val;
	    if( what_is(val) == 'number' ){ final_val = val.toString(); }
	    // Add on.
	    anchor._arguments['values'].push({'key': key, 'value': final_val});
	});

	return anchor._arguments['values'].length;
    };

    /**
     * Return list of annotations in request.
     *
     * @name annotations
     * @function
     * @returns {Array} (actual) list of request "values" pairs
     */
    anchor.annotations = function(){
	return anchor._arguments['values'];
    };

    /**
     * General use for whatever.
     *
     * @name class_expression
     * @function
     * @param {class_expression|String} class_expr - anything that can be taken by <class_expression> constructor
     * @param {String} property_id - string
     * @returns {Number} number of expressions
     */
    anchor.add_class_expression = function(class_expr){
	// Our list of values must be defined if we go this way.
	anchor._ensure_list('expressions');

	var expr = new class_expression(class_expr);
	anchor._arguments['expressions'].push(expr.structure());

	return anchor._arguments['expressions'].length;
    };

    /**
     * Function: add_svf_expression
     *
     * Special use.
     * A short form for "addition" requests that can overload the
     * literal (on the server side) with Manchester syntax.
     *
     * @name add_svf_expression
     * @function
     * @param {class_expression|String} class_expr - anything that can be taken by <class_expression> constructor
     * @param {String} property_id - string (id or...something more complicated?)
     * @returns {Number} number of expressions
     */
    anchor.add_svf_expression = function(class_expr, property_id){
	// Our list of values must be defined if we go this way.
	anchor._ensure_list('expressions');

	var expr = new class_expression();
	expr.as_svf(class_expr, property_id);
	anchor._arguments['expressions'].push(expr.structure());

	return anchor._arguments['expressions'].length;
    };

    /**
     * Intersections and unions.
     *
     * @name add_set_class_expression
     * @function
     * @param {String} type - 'intersection' or 'union'
     * @param {Array} class_expr_list - a list of anything that can be taken by <class_expression> constructor
     * @returns {Number} number of expressions
     */
    anchor.add_set_class_expression = function(type, class_expr_list){
    	// Our list of values must be defined if we go this way.
    	anchor._ensure_list('expressions');

	var expr = new class_expression();
	expr.as_set(type, class_expr_list);
	anchor._arguments['expressions'].push(expr.structure());

    	return anchor._arguments['expressions'].length;
    };

    /**
     * Return list of expressions in request.
     *
     * @name expressions
     * @function
     * @returns {Array} (actual) list of request "expressions".
     */
    anchor.expressions = function(){
	return anchor._arguments['expressions'];
    };
};

/**
 * Constructor for a Minerva request item set.
 * 
 * Handle sets of requests and serialize for Minerva call.
 * 
 * Request sets are essentially serial request queues, that reference
 * eachother using the request_variables contained in invididual
 * requests.
 * 
 * As the request_set operations almost always produce request_sets
 * (with senisible defaults and fail modes), they can easily be
 * chained together.
 * 
 * If a model_id is given, it will be applied to any request that does
 * not have one.
 *
 * @constructor
 * @param {String} user_token - string
 * @param {String} [model_id] - string
 * @returns {request_set} request set object
 */
var request_set = function(user_token, model_id){
    var anchor = this;
    anchor._is_a = 'minerva-requests.request_set';

    // 
    anchor._user_token = user_token || null;
    //anchor._intention = intention;
    anchor._model_id = model_id || null;
    anchor._requests = [];
    anchor._last_entity_id = null;

    // Intentions, whether one wants their actions to be communicated
    // to the outside world ('action' vs 'query') are now silently
    // handled withint the request_set framework. The default is the
    // weakest, unles less (almost always) a creative operation is
    // attempted.
    anchor._intention = 'query';

    /**
     * Return the ID of the last individual identified in a call
     * (implicitly or explicitly).
     * 
     * @see request_set#last_fact_triple
     * @name last_individual_id
     * @function
     * @param {Number} [number_to_skip] - number of matches to skip (default: 0)
     * @returns {String|null} string or null
     */
    anchor.last_individual_id = function(number_to_skip){
	var retval = null;

	// Get the last thing identifiable as an individual.
	// 'for' necessary for backwards breakable iteration.
	for( var ugh = anchor._requests.length; ugh > 0; ugh-- ){
	    var req = anchor._requests[ugh -1];
	    if( req.entity() === 'individual' ){
		if( number_to_skip > 0 ){ // knock off skippables
		    number_to_skip--;
		}else{
		    retval = req.individual();
		    break;
		}
	    }
	};
	
	return retval;
    };

    /**
     * In our model, facts are anonymous (do not have an ID) and need
     * to be referred to by their unique triple: subject id, object
     * id, and predicate (edge type) id.
     * 
     * This methods return a list of the three string or null.
     * 
     * @see request_set#last_individual_id
     * @name last_triple_fact
     * @function
     * @param {Number} [number_to_skip] - number of matches to skip (default: 0)
     * @returns {Array|null} list of three strings or null
     */
    anchor.last_fact_triple = function(number_to_skip){
	var retval = null;

	// Get the last thing identifiable as an individual. 'for'
	// necessary for backwards breakable iteration.
	for( var ugh = anchor._requests.length; ugh > 0; ugh-- ){
	    var req = anchor._requests[ugh -1];
	    if( req.entity() === 'edge' ){
		if( number_to_skip > 0 ){ // knock off skippables
		    number_to_skip--;
		}else{
		    retval = [];
		    retval.push(req.subject());
		    retval.push(req.object());
		    retval.push(req.predicate());
		    break;
		}
	    }
	};
	
	return retval;
    };

    /**
     * Add a request to the queue. This is the most "primitive" method
     * of adding things to the request queue and should only be used
     * when other methods (look at the API) are not available.
     * 
     * @name add
     * @function
     * @param {request} req - <request>
     * @param {intention} [intention] - 'action' or 'query' ('action' default)
     * @returns {request_set} current request set, modified; suitable for chaining 
     */
    anchor.add = function(req, intention){

	// We always want the "strongest" intention for the batch.
	// If no explicit intention is mentioned, assume that this is
	// a custom op (outside of the API) and is there for an
	// 'action'.
	if( ! intention ){
	    anchor._intention = 'action';
	}else if( intention == 'action' ){
	    anchor._intention = intention;
	}else if( intention == 'query' ){
	    // Skip as it is at least weaker than a possibly set
	    // 'action'.
	}

	anchor._requests.push(req);
	return anchor;
    };

    /**
     * Requests necessary to add an instance of with type class to the
     * model.
     * 
     * Expect: "success" and "merge".
     * 
     * @name add_individual
     * @function
     * @param {class_expression} class_expr - anything that can be taken by <class_expression> constructor
     * @param {String} [model_id] - string
     * @returns {String} id of individual added, as string
     */
    anchor.add_individual = function(class_expr, model_id){

	var retval = null;
	if( class_expr ){

	    var ind_req = new request('individual', 'add');
	    if( model_id ){ ind_req.model(model_id); } // optionally add

	    ind_req.add_class_expression(class_expr);

	    anchor.add(ind_req, 'action');

	    retval = ind_req.individual();
	}

	//return anchor;
	return retval;
    };

    /**
     * Requests necessary to remove an individual.
     * 
     * Expect: "success" and "rebuild".
     * 
     * @name remove_individual
     * @function
     * @param {String} individual_id - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.remove_individual = function(individual_id, model_id){

	if( individual_id ){

	    var ind_req = new request('individual', 'remove');
	    if( model_id ){ ind_req.model(model_id); } // optionally add

	    ind_req.individual(individual_id); 

	    anchor.add(ind_req, 'action');
	}

	return anchor;
    };

    //  value - string
    //  model_id - (optional with fact and individual) string
    anchor._op_type_to_individual = function(op, class_expr, individual_id,
					     model_id){

	if( op && class_expr && individual_id ){
	    if( op != 'add' && op != 'remove' ){
		throw new Error('unknown type operation');
	    }else{
		var type_req =
			new request('individual', op + '-type');
		type_req.individual(individual_id);

		if( model_id ){ type_req.model(model_id); } // optionally add

		// 
		type_req.add_class_expression(class_expr);

		anchor.add(type_req, 'action');
	    }
	}

	return anchor;
    };

    /**
     * Add the identified type to the individual. Multiple calls are
     * logicially treated as an "intersection", but not processed and
     * displayed as such.
     * 
     * @name add_type_to_individual
     * @function
     * @param {class_expression} class_expr - anything that can be taken by <class_expression> constructor
     * @param {String} individual_id - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_type_to_individual = function(class_expr, individual_id,
					     model_id){
	return anchor._op_type_to_individual('add', class_expr, individual_id,
					     model_id);
    };

    /**
     * Remove the identified type from the individual.
     * 
     * @name remove_type_from_individual
     * @function
     * @param {class_expression} class_expr - anything that can be taken by <class_expression> constructor
     * @param {String} individual_id - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining 
     */
    anchor.remove_type_from_individual = function(class_expr, individual_id,
						  model_id){
	return anchor._op_type_to_individual('remove', class_expr, individual_id,
					     model_id);
    };

    // Throw an error if no subject, object, predicate triple as
    // argument.
    anchor._ensure_fact = function(triple){
	if( triple && triple[0] && triple[1] && triple[2] ){
	    // Okay.
	}else{
	    throw new Error('triple did not look like a proper fact');
	}
    };

    /**
     * Requests necessary to add an edge between two instances in a
     * model.
     *
     * Expect: "success" and "merge".
     * 
     * @name add_fact
     * @function
     * @param {Array} triple - list of three strings: [SUBJECT_ID, OBJECT_ID, PREDICATE_ID]
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_fact = function(triple, model_id){
	anchor._ensure_fact(triple);

	var edge_req = new request('edge', 'add');
	if( model_id ){ edge_req.model(model_id); } // optionally add

	edge_req.fact(triple[0], triple[1], triple[2]);

	anchor.add(edge_req, 'action');

	return triple;
    };

    /**
     * Requests necessary to remove an edge between two instances in a
     * model.
     *
     * Expect: "success" and "rebuild".
     * 
     * @name remove_fact
     * @function
     * @param {Array} triple - list of three strings: [SUBJECT_ID, OBJECT_ID, PREDICATE_ID]
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.remove_fact = function(triple, model_id){
	anchor._ensure_fact(triple);

	var edge_req = new request('edge', 'remove');
	if( model_id ){ edge_req.model(model_id); } // optionally add
	
	edge_req.fact(triple[0], triple[1], triple[2]);
	
	anchor.add(edge_req, 'action');

	return anchor;
    };

    /**
     * Adds "anonymous" evidence individual that is referenced in the
     * individual's or fact's annotations to the batch.
     * 
     * @name add_evidence
     * @function
     * @param {String} evidence_id - string
     * @param {String} source_ids - string or list of strings (i.e. PMIDs)
     * @param {String} target_identifier - string (individual_id) or list of 3 strings (fact)
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_evidence = function(evidence_id, source_ids,
				   target_identifier, model_id){

	// Quick check.
	if( evidence_id && source_ids ){

	    // Create floating evidence instance...
	    var ev_ind_req = new request('individual', 'add');
	    if( model_id ){ ev_ind_req.model(model_id); } // optional
	    ev_ind_req.add_class_expression(evidence_id);
	    anchor.add(ev_ind_req, 'action');

	    // Add each source as an annotation to the floating
	    // evidence instance.
	    var ev_ind_ann_req =
		    new request('individual', 'add-annotation');
	    if( model_id ){ ev_ind_ann_req.model(model_id); } // optional
	    ev_ind_ann_req.individual(ev_ind_req.individual());
	    ev_ind_ann_req.add_annotation('source', source_ids);
	    anchor.add(ev_ind_ann_req, 'action');

	    // Switch the final tie-down object--either individual or
	    // fact (triple).
	    if( ! target_identifier ){
		throw new Error('no target identified for evidence add');
	    }else if( what_is(target_identifier) == 'string' ){

		// Tie the floating evidence to the individual
		// with an annotation to it.
		var ind_ann_req = new request('individual',
							    'add-annotation');
		if( model_id ){ ind_ann_req.model(model_id); } // optional
		ind_ann_req.individual(target_identifier);
		ind_ann_req.add_annotation('evidence', ev_ind_req.individual());
		anchor.add(ind_ann_req, 'action');
		
	    }else{
		// Bomb if not a legit triple.
		anchor._ensure_fact(target_identifier);
		
		// Tie the floating evidence to the edge with an
		// annotation to the edge.
		var ed_ann_req = new request('edge',
							   'add-annotation');
		if( model_id ){ ed_ann_req.model(model_id); } // optional
		var t = target_identifier;
		ed_ann_req.fact(t[0], t[1], t[2]);
		ed_ann_req.add_annotation('evidence', ev_ind_req.individual());
		anchor.add(ed_ann_req, 'action');
	    }
	}

	return anchor;
    };

    /**
     * Remove an evidence annotation from an individual or edge.
     * 
     * Do not need to worry about the "floating" evidence instance
     * made by evidence creation--clean-up will be taken care of by
     * Minerva.
     * 
     * @name remove_evidence
     * @function
     * @param {String} evidence_individual_id - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.remove_evidence = function(evidence_individual_id, model_id){

	// In our simplified world, evidence deletion just becomes a
	// specific case of individual deletion.
    	if( evidence_individual_id ){
	    anchor.remove_individual(evidence_individual_id, model_id);
	}

    	return anchor;
    };

    /**
     * Adds "anonymous" evidence individual that is referenced in the
     * individual's annotations, as well as a fact of it's own to the
     * batch.
     * 
     * *[WARNING: Should only be used once, probably not at all!]*
     * 
     * @name add_evidence_to_last_individual
     * @function
     * @param {String} evidence_id - string
     * @param {String} source_ids - null, string, or list of strings (PMIDs, etc.)
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_evidence_to_last_individual = function(evidence_id, source_ids,
						      model_id){

	var tmp_indv = anchor.last_individual_id();
	if( tmp_indv ){
	    anchor.add_evidence(evidence_id, source_ids, tmp_indv, model_id);
	}

	return anchor;
    };

    /**
     * Adds "anonymous" evidence individual that is referenced in the
     * fact's annotations, as well as a fact of it's own to the batch.
     * 
     * *[WARNING: Should only be used once, probably not at all!]*
     * 
     * @name add_evidence_to_last_fact
     * @function
     * @param {String} evidence_id - string
     * @param {String} source_ids - null, string, or list of strings (PMIDs, etc.)
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_evidence_to_last_fact = function(evidence_id, source_ids,
						model_id){

	var tmp_triple = anchor.last_fact_triple();
	if( tmp_triple ){
	    anchor.add_evidence(evidence_id, source_ids, tmp_triple, model_id);
	}

	return anchor;
    };

    // A helper function to sort out all of the different annotation
    // operations and targets in one function.
    //
    // Args:
    //  op - "add" | "remove"
    //  thing - "model" | "individual" | "edge" 
    //  thing_identifier - ind: id; fact: triple; model: implied
    //  key - string 
    //  value - string
    //  model_id - (optional with fact and individual) string
    anchor._op_annotation_to_target = function(op, target, target_identifier,
					       key, value, model_id){

	// First, decide the request.
	var req = null;
	if( op == 'add' || op == 'remove' ){
	    req = new request(target, op + '-annotation');
	    if( model_id ){ req.model(model_id); } // optional
	}else{
	    throw new Error('unknown annotation operation');
	}

	// Add necessary arguments to identify the target.
	if( target == 'model' ){
	    // Already done.
	}else if( target == 'individual' ){
	    req.individual(target_identifier);
	}else if( target == 'edge' ){
	    anchor._ensure_fact(target_identifier);
	    req.fact(target_identifier[0],
		     target_identifier[1],
		     target_identifier[2]);
	}else{
	    throw new Error('unknown annotation target');
	}

	// Add the annotation.
	if( key && value ){	
	    req.add_annotation(key, value);
	    anchor.add(req, 'action');
	}
    };

    /**
     * Adds unique key/value set to model.
     * 
     * @name add_annotation_to_model
     * @function
     * @param {String} key - string
     * @param {String} value - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_annotation_to_model = function(key, value, model_id){
	anchor._op_annotation_to_target('add', 'model', null,
					key, value, model_id);
	return anchor;
    };

    /**
     * Adds unique key/value set to model.
     * 
     * @name remove_annotation_from_model
     * @function
     * @param {String} key - string
     * @param {String} value - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.remove_annotation_from_model = function(key, value, model_id){
	anchor._op_annotation_to_target('remove', 'model', null,
					key, value, model_id);
	return anchor;
    };

    /**
     * Adds unique key/value set to an individual.
     * 
     * @name add_annotation_to_individual
     * @function
     * @param {String} key - string
     * @param {String} value - string
     * @param {String} individual_id - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_annotation_to_individual = function(key, value, individual_id,
						   model_id){
	anchor._op_annotation_to_target('add', 'individual', individual_id,
					key, value, model_id);
	return anchor;
    };

    /**
     * Removes unique key/value set from an individual.
     * 
     * @name remove_annotation_from_individual
     * @function
     * @param {String} key - string
     * @param {String} value - string
     * @param {String} individual_id - string
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.remove_annotation_from_individual = function(key, value,
							individual_id, model_id){
	anchor._op_annotation_to_target('remove', 'individual', individual_id,
					key, value, model_id);
	return anchor;
    };

    /**
     * Adds unique key/value set to a fact.
     * 
     * @name add_annotation_to_fact
     * @function
     * @param {String} key - string
     * @param {String} value - string
     * @param {String} triple - list of three strings: [SUBJECT_ID, OBJECT_ID, PREDICATE_ID]
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_annotation_to_fact = function(key, value, triple, model_id){
	anchor._ensure_fact(triple);
	anchor._op_annotation_to_target('add', 'edge',
					triple,	key, value, model_id);
	return anchor;
    };

    /**
     * Removes unique key/value set from a fact.
     * 
     * @name remove_annotation_from_fact
     * @function
     * @param {String} key - string
     * @param {String} value - string
     * @param {String} triple - list of three strings: [SUBJECT_ID, OBJECT_ID, PREDICATE_ID]
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.remove_annotation_from_fact = function(key, value, triple, model_id){
	anchor._ensure_fact(triple);
	anchor._op_annotation_to_target('remove', 'edge', triple,
					key, value, model_id);
	return anchor;
    };

    /**
     * Undo the last batch of operations performed on the model.
     * 
     * @name undo_last_model_batch
     * @function
     * @param {String} [model_id] - string
     * @returns {request_set} 
     */
    anchor.undo_last_model_batch = function(model_id){

	var mod_req = new request('model', 'undo');
	if( model_id ){ mod_req.model(model_id); } // optionally add

	anchor.add(mod_req, 'action');

	return anchor;
    };

    /**
     * Redo the last batch of operations performed on the model.
     * 
     * @name redo_last_model_batch
     * @function
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.redo_last_model_batch = function(model_id){

	var mod_req = new request('model', 'redo');
	if( model_id ){ mod_req.model(model_id); } // optionally add

	anchor.add(mod_req, 'action');

	return anchor;
    };

    /**
     * Essentially, get the list of relations.
     * 
     * @name get_meta
     * @function
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.get_meta = function(){

	var req = new request('meta', 'get');

	// Just personal question.
	anchor.add(req, 'query');
	
	return anchor;
    };

    /**
     * The the state of a model.
     * 
     * This *[CANNOT]* be used with any other request.
     * 
     * @name get_model
     * @function
     * @param {String} model_id - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.get_model = function(model_id){
	
	var req = new request('model', 'get');
	if( model_id ){ req.model(model_id); }
	
	// Just personal question.
	anchor.add(req, 'query');
	
	return anchor;
    };

    /**
     * Get the current undo/redo information for a model.
     * 
     * This *[CANNOT]* be used with any other request.
     * 
     * @name get_undo_redo
     * @function
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.get_undo_redo = function(model_id){

	var req = new request('model', 'get-undo-redo');
	if( model_id ){ req.model(model_id); }
	
	// Just personal question.
	anchor.add(req, 'query');

	return anchor;
    };

    /**
     * Essentially a wrapper for the "generate" class of model
     * methods. The possible seeding arguments fir the argument hash
     * are:
     *  class-id - *[optional]* string; an initial class to build around
     *  taxon-id - *[optional]* string; the background species
     * 
     * @name add_model
     * @function
     * @param {Object} argument_hash - string (see above for properties)
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.add_model = function(argument_hash){

	// Work out all incoming arguments to testable state.
	var cls_id = null;
	var tax_id = null;
	if( argument_hash ){	    
	    if( argument_hash['class-id'] ){
		cls_id = argument_hash['class-id'];
	    }
	    if( argument_hash['taxon-id'] ){
		tax_id = argument_hash['taxon-id'];
	    }
	}

	// Now that all arguments are defined, build up the request.
	var model_req = new request('model', 'add');
	if( cls_id ){ model_req.special('class-id', cls_id); }
	if( tax_id ){ model_req.special('taxon-id', tax_id); }
	// Unlikely to have any listeners though...
	anchor.add(model_req, 'action');

	return anchor;
    };

    /**
     * Store the model to the model store (file on disk as of this
     * writing, but may change soon).
     * 
     * @name store_model
     * @function
     * @param {String} [model_id] - string
     * @returns {request_set} current request set, modified; suitable for chaining
     */
    anchor.store_model = function(model_id){

	var store_req = new request('model', 'store');
	if( model_id ){ store_req.model(model_id); } // optionally add

	// No need to broadcast and disrupt to others on the model if
	// it's just this.
	anchor.add(store_req, 'query');

	return anchor;
    };

    /**
     * Create the JSON object that will be passed to the Minerva
     * server.
     * 
     * @name structure
     * @function
     * @returns {Object} final object of all queued requests
     */
    anchor.structure = function(){

	// Ready the base return.
	var rset = {
	    'token': anchor._user_token,
	    'intention': anchor._intention
	};

	// Add a JSON stringified request arguments.
	var reqs = [];
	each(anchor._requests, function(req){
	    // If possible, add model in cases where is was not supplied.
	    if( ! req.model() && anchor._model_id ){
		req.model(anchor._model_id);
	    }
	    reqs.push(req.objectify());
	});
	rset['requests'] = reqs;

	return rset;
    };

    /**
     * Serialize a request set and the component requests.
     * 
     * @name callable
     * @function
     * @returns {Object} serialization of all queued requests
     */
    anchor.callable = function(){

	var rset = anchor.structure();
	var reqs = rset['requests'];

	var str = JSON.stringify(reqs);
	var enc = encodeURIComponent(str);
	rset['requests'] = enc;

	return rset;
    };
};

///
/// Exportable body.
///

module.exports = {

    'request_variable': request_variable,
    'request': request,
    'request_set': request_set

};
