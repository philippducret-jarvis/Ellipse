import test from 'node:test';
import assert from 'node:assert/strict';
import {isManagedDatabase} from './ensure-ellipse-database.mjs';

test('la récupération automatique reste limitée à la BDD locale Ellipse',()=>{
  for(const host of ['localhost','127.0.0.1','[::1]']) assert.equal(isManagedDatabase(`postgresql://user:pass@${host}:5435/ellisphere`),true);
  for(const url of ['postgresql://u:p@remote.example:5435/ellisphere','postgresql://u:p@localhost:5432/ellisphere','postgresql://u:p@localhost:5435/another_project']) assert.equal(isManagedDatabase(url),false);
});
