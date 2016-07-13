This folder contains the data that should be inserted in your neo4j database.

In order to insert the three kinds of nodes and the relations:

move the .csv files to "/Applications/Neo4j Community Edition.app/Contents/Resources/app" and from there, use this comand line:

bin/neo4j-import --into *DB_NAME*.db \
		 --nodes:HeadWord:Word headerHW.csv,hwnodes.csv \
		 --nodes:DefWord:Word headerDef.csv,defnodes.csv  \
		 --nodes:Variable headerVar.csv,varnodes.csv  \
                 --relationships headerRel.csv,rels.csv \

for better instructions, refer to: https://neo4j.com/developer/guide-import-csv/
