export function sqliteAdapter(sqlite){
  return {
    prepare(sql){
      let values=[];
      return {
        bind(...args){values=args;return this;},
        async first(){return sqlite.prepare(sql).get(...values);},
        async all(){return {results:sqlite.prepare(sql).all(...values)};},
        runSync(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}};},
        async run(){return this.runSync();}
      };
    },
    // Keep the transaction synchronous. An await here would allow a second
    // HTTP request to enter the same SQLite connection before COMMIT.
    async batch(statements){
      sqlite.exec('BEGIN');
      try{const result=statements.map(statement=>statement.runSync());sqlite.exec('COMMIT');return result;}
      catch(error){sqlite.exec('ROLLBACK');throw error;}
    }
  };
}
