////
//// Some unit testing for minerva-requests.
////

var chai = require('chai');
chai.config.includeStack = true;
assert = chai.assert;
var class_expression = require('class-expression');
var minerva_requests = require('..');
var request_variable = minerva_requests.request_variable;
var request = minerva_requests.request;
var request_set = minerva_requests.request_set;

///
/// Helpers.
///

//
function ll(x){
    if( x && x.structure ){
	console.log(JSON.stringify(x.structure(), null, ' '));
    }else{
	console.log(JSON.stringify(x, null, ' '));
    }
}

///
/// Start unit testing.
///

describe('simple testing for request_variable', function(){

    it('id', function(){
	var rv = new request_variable();
	assert.equal(rv.value().length, 36,
	     'like 8ccbf846-d7e8-4d86-9e5c-0b48827d178d');
	assert.isFalse(rv.set_p(), 'not set');
	
    });
    
    it('values', function(){
	var rv = new request_variable('foo');
	assert.equal(rv.value(), 'foo', 'constructor value');
	assert.isTrue(rv.set_p(), 'set explicitly in constructor');
    });
    
    it('more values', function(){
	var rv = new request_variable();
	rv.value('foo');
	assert.equal(rv.value(), 'foo', 'method value');
	assert.isTrue(rv.set_p(), true, 'set explicitly in call');
    });

});


describe('requests behave as intended', function(){

    it("implicitly autogenerated IDs are different", function(){
	var i1_req = new request('individual', 'add');
	i1_req.add_class_expression('GO:111');
	
	var i2_req = new request('individual', 'add');
	i2_req.add_class_expression('GO:222');
	
	var f_req = new request('edge', 'add');
	f_req.fact(i1_req.individual(), i2_req.individual(), 'is_a');
	
	assert.equal(f_req.subject(), i1_req.individual(), 'same individual 1');
	assert.equal(f_req.object(), i2_req.individual(), 'same individual 2');
	assert.notEqual(f_req.subject(), f_req.object(), 'but not same individual');
    });

    it('a more realistic example', function(){
	// 
	var model_id = '123';

	// New process individual.
	var ind1_req = new request('individual', 'add');
	ind1_req.model(model_id);
	ind1_req.add_class_expression('GO:0022008'); // neurogenesis
	
	// New component (location) individual.
	var ind2_req = new request('individual', 'add');
	ind2_req.model(model_id);
	ind2_req.add_class_expression('CL:0000125'); // glial cell
	
	// ind1 occurs_in ind2.
	var e2_req = new request('edge', 'add');
	e2_req.model(model_id);
	e2_req.fact(ind1_req.individual(), ind2_req.individual(), 'occurs_in');

	assert.equal(ind1_req.objectify()['arguments']['assign-to-variable'], 
	     ind1_req.individual(),
	     'var for ind');
	assert.equal(e2_req.objectify()['arguments']['assign-to-variable'],
	     null,
	     'no var for edge');
	
	// // Toy run.
	// var mid = 'gomodel:5515e3c80000001';
	// var manager = new manager('http://localhost:3400',
	// 					'minerva_local',
	// 					'123',
	// 					'node');
	// // 
	// var each = bbop.core.each;
	// each(['meta', 'merge', 'rebuild', 'error'], function(callback_type){
	//     manager.register(callback_type, 'foo', function(resp, man){
	// 	console.log(resp);
	//     });
	// // Call
	// manager.DO_NOT_USE_THIS(mid);
    });
});

describe('request_set behaves as intended', function(){

    it('makes request and decode the payload, also test structure()', function(){
	
	var reqs = new request_set('foo');
	var req = new request('model', 'get');
	req.model('123');
	reqs.add(req, 'query'); // if not explicit, becomes 'action'
	var args = reqs.callable();
	
	assert.equal(args.token, 'foo', 'foo uid');
	assert.equal(args.intention, 'query', 'information intent');
	
	var blob = args.requests;
	var deblob = decodeURIComponent(blob);
	var jsblob = JSON.parse(deblob);
	assert.equal(jsblob.length, 1, 'one request');
	assert.equal(jsblob[0].entity, 'model', 'model entity');
	assert.equal(jsblob[0].operation, 'get', 'get model');
	assert.equal(jsblob[0].arguments['model-id'], '123', 'model 123');
    });


    it('Two ways to add model id to a request.', function(){

	
	var reqs1 = new request_set('utoken', 'mid:123');
	reqs1.add_individual('GO:123');
	var st1 = reqs1.structure();

	var reqs2 = new request_set('utoken');
	reqs2.add_individual('GO:123', 'mid:123');
	var st2 = reqs1.structure();
	
	assert.equal('mid:123',
	     st2['requests'][0]['arguments']['model-id'],
	     'correct model ID');
	assert.equal(st1['requests'][0]['arguments']['model-id'],
	     st2['requests'][0]['arguments']['model-id'],
	     'two ways to add model');
    });

    it('check last_individual_id, last_fact_triple, and stack count', function(){
	
	var reqs = new request_set('utoken', 'mid:123');
	
	// Nothing there yet.
	assert.equal(reqs.last_individual_id(), null,
	     'no last individial yet');
	assert.equal(reqs.last_fact_triple(), null,
	     'no last edge yet');
	
	// Add an individiual to the request stack.
	reqs.add_individual('GO:123');
	assert.equal(reqs.last_individual_id(), // cheat to examine
	     reqs.structure()['requests'][0]['arguments']['assign-to-variable'],
	     'seeing the last and only individual');
	
	// Add an individiual to the request stack.
	reqs.add_individual('GO:456');
	assert.equal(reqs.last_individual_id(), // cheat to examine
	     reqs.structure()['requests'][1]['arguments']['assign-to-variable'],
	     'see the last individual on the stack');
	
	// Check the countback versions of function.
	assert.equal(reqs.last_individual_id(0), // cheat to examine
	     reqs.structure()['requests'][1]['arguments']['assign-to-variable'],
	     'same as no argument');
	assert.equal(reqs.last_individual_id(1), // cheat to examine
	     reqs.structure()['requests'][0]['arguments']['assign-to-variable'],
	     'count back one');
	
	// Still no edge.
	assert.equal(reqs.last_fact_triple(), null,
	     'still no last edge');

	// Add an edge.
	reqs.add_fact([reqs.last_individual_id(1),
		       reqs.last_individual_id(0),
		       "ECO:123"]);
	
	// We have our first edge?
	assert.deepEqual(reqs.last_fact_triple(),
			 [reqs.last_individual_id(1),
			  reqs.last_individual_id(0),
			  "ECO:123"],
			 'first edge as expected');
	assert.deepEqual(reqs.last_fact_triple(0),
			 [reqs.last_individual_id(1),
			  reqs.last_individual_id(0),
			  "ECO:123"],
			 'first edge, other reference');
	assert.equal(reqs.last_fact_triple(1), null,
		     'out-of-bounds works with first edge');

	// Add yet another individiual to the request stack (request #4)
	reqs.add_individual('GO:789');
	assert.equal(reqs.last_individual_id(), // cheat to examine
	     reqs.structure()['requests'][3]['arguments']['assign-to-variable'],
	     'see the last individual on the stack');
	
	// Check that our countback frame has shifted.
	assert.equal(reqs.last_individual_id(0), // cheat to examine
	     reqs.structure()['requests'][3]['arguments']['assign-to-variable'],
	     'after adding edge, same as no argument');
	assert.equal(reqs.last_individual_id(1), // cheat to examine
	     reqs.structure()['requests'][1]['arguments']['assign-to-variable'],
	     'after adding edge, count back one');
	assert.equal(reqs.last_individual_id(2), // cheat to examine
	     reqs.structure()['requests'][0]['arguments']['assign-to-variable'],
	     'after adding edge, count back two');
	
	// Check that out of bounds is okay.
	assert.equal(reqs.last_individual_id(3),
	     null,
	     'there is nothing that far back');

	// Add another edge to the stack.
	reqs.add_fact([reqs.last_individual_id(1),
		       reqs.last_individual_id(0),
		       "ECO:456"]);

	// We have our second edge?
	assert.deepEqual(reqs.last_fact_triple(),
			 [reqs.last_individual_id(1),
			  reqs.last_individual_id(0),
			  "ECO:456"],
			 'second edge as expected');
	assert.deepEqual(reqs.last_fact_triple(0),
			 [reqs.last_individual_id(1),
			  reqs.last_individual_id(0),
			  "ECO:456"],
			 'second edge, other reference');
	// Another look at the first edge.
	assert.deepEqual(reqs.last_fact_triple(1),
			 [reqs.last_individual_id(2),
			  reqs.last_individual_id(1),
			  "ECO:123"],
			 'first edge still there');
	assert.equal(reqs.last_fact_triple(2), null,
		     'out-of-bounds works with two edges');

    });

});

describe('annotations behave as expected', function(){
    it('look at wrapping function to get all of the variations into a single bit of code (i.e. _op_annotation_to_target)', function(){

	var mod = 'mid:123';
	var key = 'k';
	var value = 'v';
	var sub = 'GO:123';
	var ob = 'GO:456';
	var pred = 'ECO:001';
	
	///
	/// Add all of the variations.
	///
	
	var reqs = new request_set('utoken', mod);
	
	reqs.add_annotation_to_model(key, value);
	reqs.remove_annotation_from_model(key, value);
	
	reqs.add_annotation_to_individual(key, value, sub);
	reqs.remove_annotation_from_individual(key, value, sub);
	
	reqs.add_annotation_to_fact(key, value, [sub, ob, pred]);
	reqs.remove_annotation_from_fact(key, value, [sub, ob, pred]);
	
	var all_requests = reqs.structure()['requests'];
	assert.deepEqual(all_requests[0],
	     {
		 "entity": "model",
		 "operation": "add-annotation",
		 "arguments": {
		     "values": [
			 {
			     "key": "k",
			     "value": "v"
			 }
		     ],
		     "model-id": "mid:123"
		 }
	     },
	     'model add-annotation okay');
	assert.deepEqual(all_requests[1],
	     {
		 "entity": "model",
		 "operation": "remove-annotation",
		 "arguments": {
		     "values": [
			 {
			     "key": "k",
			     "value": "v"
			 }
		     ],
		     "model-id": "mid:123"
		 }
	     },
	     'model remove-annotation okay');
	assert.deepEqual(all_requests[2],
	     {
		 "entity": "individual",
		 "operation": "add-annotation",
		 "arguments": {
		     "individual": "GO:123",
		     "values": [
			 {
			     "key": "k",
			     "value": "v"
			 }
		     ],
		     "model-id": "mid:123"
		 }
	     },
	     'ind add-annotation okay');
	assert.deepEqual(all_requests[3],
	     {
		 "entity": "individual",
		 "operation": "remove-annotation",
		 "arguments": {
		     "individual": "GO:123",
		     "values": [
			 {
			     "key": "k",
			     "value": "v"
			 }
		     ],
		     "model-id": "mid:123"
		 }
	     },
	     'ind remove-annotation okay');
	assert.deepEqual(all_requests[4],
	     {
		 "entity": "edge",
		 "operation": "add-annotation",
		 "arguments": {
		     "subject": "GO:123",
		     "object": "GO:456",
		     "predicate": "ECO:001",
		     "values": [
			 {
			     "key": "k",
			     "value": "v"
			 }
		     ],
		     "model-id": "mid:123"
		 }
	     },
	     'fact add-annotation okay');
	assert.deepEqual(all_requests[5],
	     {
		 "entity": "edge",
		 "operation": "remove-annotation",
		 "arguments": {
		     "subject": "GO:123",
		     "object": "GO:456",
		     "predicate": "ECO:001",
		     "values": [
			 {
			     "key": "k",
			     "value": "v"
			 }
		     ],
		     "model-id": "mid:123"
		 }
	     },
	     'fact remove-annotation okay');
    });
});

describe('evidence behaves as expected', function(){
    it('', function(){
	var reqs = new request_set('utoken', 'mid:123');

	// axon guidance receptor activity
	var mf = reqs.add_individual('GO:0008046');
	
	// neurogenesis
	var bp = reqs.add_individual('GO:0022008');
	
	// FACT!
	var triple = reqs.add_fact([mf, bp, 'part_of']);
	
	// Evidence.
	reqs.add_evidence('ECO:0000001', 'PMID:0000000', mf);
	reqs.add_evidence('ECO:0000001', ['PMID:0000000'], triple);

	// var target_request = {
	//  "token": "utoken",
	//  "intention": "action",
	//  "requests": [
	//   {
	//    "entity": "individual",
	//    "operation": "add",
	//    "arguments": {
	//     "expressions": [
	//      {
	//       "type": "class",
	//       "id": "GO:0008046"
	//      }
	//     ],
	//     "model-id": "mid:123",
	//     "assign-to-variable": "319752b9-24c6-4c7c-94f7-a0152843eecc"
	//    }
	//   },
	//   {
	//    "entity": "individual",
	//    "operation": "add",
	//    "arguments": {
	//     "expressions": [
	//      {
	//       "type": "class",
	//       "id": "GO:0022008"
	//      }
	//     ],
	//     "model-id": "mid:123",
	//     "assign-to-variable": "57b4fbb0-5df9-4ffa-9fd5-73c19b80aea3"
	//    }
	//   },
	//   {
	//    "entity": "edge",
	//    "operation": "add",
	//    "arguments": {
	//     "subject": "319752b9-24c6-4c7c-94f7-a0152843eecc",
	//     "object": "57b4fbb0-5df9-4ffa-9fd5-73c19b80aea3",
	//     "predicate": "part_of",
	//     "model-id": "mid:123"
	//    }
	//   },
	//   {
	//    "entity": "individual",
	//    "operation": "add",
	//    "arguments": {
	//     "expressions": [
	//      {
	//       "type": "class",
	//       "id": "ECO:0000001"
	//      }
	//     ],
	//     "model-id": "mid:123",
	//     "assign-to-variable": "4f5fe9c3-ddda-4a1d-9da8-031535966529"
	//    }
	//   },
	//   {
	//    "entity": "individual",
	//    "operation": "add-annotation",
	//    "arguments": {
	//     "individual": "4f5fe9c3-ddda-4a1d-9da8-031535966529",
	//     "values": [
	//      {
	//       "key": "source",
	//       "value": "PMID:0000000"
	//      }
	//     ],
	//     "model-id": "mid:123"
	//    }
	//   },
	//   {
	//    "entity": "individual",
	//    "operation": "add-annotation",
	//    "arguments": {
	//     "individual": "319752b9-24c6-4c7c-94f7-a0152843eecc",
	//     "values": [
	//      {
	//       "key": "evidence",
	//       "value": "4f5fe9c3-ddda-4a1d-9da8-031535966529"
	//      }
	//     ],
	//     "model-id": "mid:123"
	//    }
	//   },
	//   {
	//    "entity": "individual",
	//    "operation": "add",
	//    "arguments": {
	//     "expressions": [
	//      {
	//       "type": "class",
	//       "id": "ECO:0000001"
	//      }
	//     ],
	//     "model-id": "mid:123",
	//     "assign-to-variable": "f8a6f1bf-6123-45cf-969d-da2405f9c8ca"
	//    }
	//   },
	//   {
	//    "entity": "individual",
	//    "operation": "add-annotation",
	//    "arguments": {
	//     "individual": "f8a6f1bf-6123-45cf-969d-da2405f9c8ca",
	//     "values": [
	//      {
	//       "key": "source",
	//       "value": "PMID:0000000"
	//      }
	//     ],
	//     "model-id": "mid:123"
	//    }
	//   },
	//   {
	//    "entity": "edge",
	//    "operation": "add-annotation",
	//    "arguments": {
	//     "subject": "319752b9-24c6-4c7c-94f7-a0152843eecc",
	//     "object": "57b4fbb0-5df9-4ffa-9fd5-73c19b80aea3",
	//     "predicate": "part_of",
	//     "values": [
	//      {
	//       "key": "evidence",
	//       "value": "f8a6f1bf-6123-45cf-969d-da2405f9c8ca"
	//      }
	//     ],
	//     "model-id": "mid:123"
	//    }
	//   }
	//  ]
	// };

	var all_requests = reqs.structure()['requests'];

	assert.equal(all_requests.length, 9,
	     'this takes 9 ops in total: 1 + 1 + 1 + 3 + 3');
	
	// Last has proper SOV.
	assert.notEqual(all_requests[8]['arguments']['subject'], null,
	     'edge ann has sub');
	assert.notEqual(all_requests[8]['arguments']['object'], null,
	     'edge ann has obj');
	assert.notEqual(all_requests[8]['arguments']['predicate'], null,
	     'edge ann has pred');

	
    });
});

describe('types behave as expected', function(){
    it("let's look at types", function(){
	var reqs = new request_set('utoken', 'mid:123');

	reqs.remove_type_from_individual(
	    class_expression.cls('SGD:S000003814'),
	    'gomodel_taxon_559292-5525a0fc0000001-SGD-S000003814-553ff9ed0000002'
	);
	
	assert.notEqual(
	    reqs.structure()['requests'][0]['arguments']['individual'], null,
    	    'define an individual in type request');
    });
});

describe('look at a full assembly', function(){
    it("easy assembly", function(){

	var mod = 'mid:123';

	// REPL-ish
	var union = class_expression.union;
	var intersection = class_expression.intersection;
	var svf = class_expression.svf;
	var cls = class_expression.cls;

	///
	/// Add all of the variations.
	///
	
	var reqs = new request_set('utoken', mod);
	
	var sb = reqs.add_individual(intersection(['GO:123', 'GO:456']));
	var ob = reqs.add_individual('GO:789');
	var ed = reqs.add_fact([sb, ob, 'RO:123']);
	
    });

    it('different ways of doing a "real" example', function(){

	var reqs = new request_set('utoken', 'mid:123');

	// axon guidance receptor activity
	var mf = reqs.add_individual('GO:0008046');
	
	// neurogenesis
	var bp = reqs.add_individual('GO:0022008');
	
	// cell part
	var loc = reqs.add_individual('GO:0004464');
	
	// Drd3
	var gp = reqs.add_individual('MGI:MGI:94925');
	
	reqs.add_fact([mf, bp, 'part_of']);
	
	// reqs.add_evidence_to_fact('ECO:0000001', ['PMID:0000000'],
	// 			  mf, bp, 'part_of');
	reqs.add_evidence_to_last_fact('ECO:0000001', ['PMID:0000000']);
	
	// act occurs_in loc.
	reqs.add_fact([mf, loc, 'RO:0002333']);
	
	// act enabled_by gp.
	reqs.add_fact([mf, gp, 'occurs_in']);

    });
});
