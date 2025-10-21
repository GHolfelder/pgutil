/**
 * Column definition for database table.
 */
export type Column = {
    /** Name of column */
    name: string;
    /** SQL type of column */
    sqlType?: string;
    /** Is column the primary key, defaults to false */
    primaryKey?: boolean;
    /** Is column nullable, defaults to false */
    nullable?: boolean;
    /** Is column an auto increment field, defaults to false */
    autoIncrement?: boolean;
    /** Is column a foreign key, defaults to false */
    foreignKey?: boolean;
    /** Column default value, creates a constraint on the column */
    defaultValue?: string | number | boolean;
    /** Enumerated value constraint to be applied to column */
    enumValues?: { value: string | number; label?: string }[];
}

/**
 * Foreign key constraint definition for database table.
 */
export type ForeignKey = {
    /** Name of local column in this schema */
    localColumn: string;
    /** Referenced table name */
    referencedTable: string;
    /** Referenced column name in the referenced table */
    referencedColumn: string;
    /** Action on delete */
    onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
    /** Action on update */
    onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

/**
 * Base filter definition
 */
type FilterBase = {
    /** Comparison operator, defaults to '=' */
    operator?: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'ILIKE' | 'IS' | 'IS NOT';
    /** Filter value (can be null for IS / IS NOT checks) */
    value: string | number | boolean | null;
}

/**
 * Filter definition for querying database table.
 */
export type Filter = (
    {
        /** Name of column to filter on (short form, will be resolved to alias.column) */ 
        column: string 
    } & FilterBase
) | (
    {
        /** Full column reference including alias, e.g. "ct_id". Alias must match table alias */
        alias: string 
    } & FilterBase
);

export class Schema {
    private columns: Column[] = [];
    private constraints: ForeignKey[] = [];
    private tableName: string;
    private alias: string;

    constructor(tableName: string, alias?: string, columns?: Column[], constraints?: ForeignKey[]) {
        this.tableName = tableName;
        this.alias = (alias || tableName).toLowerCase();
        if (columns) this.columns = columns;
        if (constraints) this.constraints = constraints;
    }

    addColumn(column: Column | Column[]): Schema{
        if (Array.isArray(column)) this.columns.push(...column);
        else this.columns.push(column);
        return this;
    }

    addConstraint(constraint: ForeignKey | ForeignKey[]): Schema {
        if (Array.isArray(constraint)) this.constraints.push(...constraint);
        else this.constraints.push(constraint);
        return this;
    }

    getAlias(): string { return this.alias; }

    getColumnAliases(includePrimary: boolean): string[] {
        const alias = this.getAlias();
        return this.columns
            .filter((col) => includePrimary || !col.primaryKey)
            .map((col) => `${alias}_${col.name}`);
    }

    getColumnFields(includePrimary: boolean, useLabels: boolean): string[] {
        const alias = this.getAlias();
        return this.columns
            .filter((col) => includePrimary || !col.primaryKey)
            .map((col) => {
                if (useLabels && col.enumValues) {
                    return `${this.enumExpression(col)} AS "${alias}_${col.name}_label"`;
                } else {
                    return `${alias}.${col.name} AS "${alias}_${col.name}"`;
                }
            });
    }

    getColumnNames(includePrimary: boolean): string[] {
        const alias = this.getAlias();
        return this.columns
            .filter((col) => includePrimary || !col.primaryKey)
            .map((col) => `${alias}.${col.name}`);
    }

    getPrimaryKey(useAlias: boolean): string | null {
        for (const col of this.columns) {
            if (col.primaryKey) return this.getAlias() + (useAlias ? '_' : '.') + col.name;
        }
        return null;
    }

    getTableName(useSql = false): string { return useSql ? this.tableName.toLowerCase() : this.tableName; }

    sqlCreateTable(): string {
        const table = this.getTableName(true);
        const columnsSql = this.columns.map(col => {
            let colDef = `${col.name} ${col.sqlType || 'text'}`; 
            if (col.primaryKey) colDef += ' PRIMARY KEY';
            if (col.nullable) colDef += ' NULL';
            if (col.autoIncrement) colDef += ' GENERATED ALWAYS AS IDENTITY';
            if (col.defaultValue !== undefined) {
                if (typeof col.defaultValue === 'string') colDef += ` DEFAULT '${col.defaultValue.replace(/'/g, "''")}'`;
                else colDef += ` DEFAULT ${col.defaultValue}`;
            }
            return colDef;
        }).join(', ');
        return `CREATE TABLE IF NOT EXISTS ${table} (${columnsSql});`;
    }

    sqlCreateEnumConstraints(): string[] {
        const table = this.getTableName(true);
        const constraints: string[] = [];
        this.columns.forEach(col => {
            if (col.enumValues) {
                const constraintName = `${table}_${col.name}_enum_chk`;
                const allowedValues = col.enumValues
                    .map(ev => typeof ev.value === 'number' ? `${ev.value}` : `'${String(ev.value).replace(/'/g, "''")}'`)
                    .join(', ');
                const constraintSql = [`DO $$`,`BEGIN`,`  IF NOT EXISTS (`,
                    `    SELECT 1 FROM pg_constraint c`,`    JOIN pg_class t ON c.conrelid = t.oid`,
                    `    WHERE lower(c.conname) = lower('${constraintName}') AND t.relname = '${table}'`,
                    `  ) THEN`,
                    `    ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} CHECK (${col.name} IN (${allowedValues}));`,
                    `  END IF;`,`END`,`$$;`].join('\n');
                constraints.push(constraintSql);
            }
        });
        return constraints;
    }

    sqlCreateTableConstraints(): string[] {
        const table = this.getTableName(true);
        const constraintsSql: string[] = [];
        this.constraints.forEach((fk) => {
            const constraintName = `${table}_${fk.localColumn}_fk`;
            const localCol = fk.localColumn;
            const refTable = fk.referencedTable.toLowerCase();
            const refCol = fk.referencedColumn;
            const actions: string[] = [];
            if (fk.onDelete) actions.push(`ON DELETE ${fk.onDelete}`);
            if (fk.onUpdate) actions.push(`ON UPDATE ${fk.onUpdate}`);
            const actionSql = actions.length ? ` ${actions.join(' ')}` : '';
            const sql = [`DO $$`,`BEGIN`,`  IF NOT EXISTS (`,
                `    SELECT 1 FROM pg_constraint c`,`    JOIN pg_class t ON c.conrelid = t.oid`,
                `    WHERE lower(c.conname) = lower('${constraintName}') AND t.relname = '${table}'`,
                `  ) THEN`,
                `    ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${localCol}) REFERENCES ${refTable}(${refCol})${actionSql};`,
                `  END IF;`,`END`,`$$;`].join('\n');
            constraintsSql.push(sql);
        });
        return constraintsSql;
    }

    sqlTableDrop(): string { const table = this.getTableName(true); return `DROP TABLE IF EXISTS ${table};`; }

    sqlSelect(useLabels: boolean, filter?: Filter | Filter[]): string {
        const fields = this.getColumnFields(true, useLabels).join(', ');
        const table = this.getTableName(true);
        const alias = this.getAlias();
        const whereClause = this.whereClause(filter);
        return `SELECT ${fields} FROM ${table} AS ${alias}${whereClause}`;
    }

    sqlInsert(data: object): string {
        const table = this.getTableName(true);
        const alias = this.getAlias();
        const columns: string[] = [];
        const placeholders: string[] = [];
        for (const col of this.columns) {
            const aliasKey = `${alias}_${col.name}`;
            if (Object.prototype.hasOwnProperty.call(data, aliasKey)) {
                columns.push(`${alias}.${col.name}`);
                placeholders.push(`$${aliasKey}`);
            }
        }
        if (columns.length === 0) return '';
        return `INSERT INTO ${table} AS ${alias} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    }

    sqlUpdate(data: object): string {
        const table = this.getTableName(true);
        const alias = this.getAlias();
        const setClauses: string[] = [];
        for (const col of this.columns) {
            if (Object.prototype.hasOwnProperty.call(data, col.name) && !col.primaryKey) {
                setClauses.push(`${alias}.${col.name} = $${alias}_${col.name}`);
            }
        }
        const pkField = this.getPrimaryKey(false);
        const pkPlaceholder = `$${this.getPrimaryKey(true)}`;
        return `UPDATE ${table} AS ${alias} SET ${setClauses.join(', ')} WHERE ${pkField} = ${pkPlaceholder}`;
    }

    sqlDelete(filter?: Filter | Filter[]): string {
        const table = this.getTableName(true);
        const alias = this.getAlias();
        const whereClause = this.whereClause(filter);
        return `DELETE FROM ${table} AS ${alias}${whereClause}`;
    }

    aliasToColumnName(aliasColumn: string): string {
        const prefix = this.getAlias() + '_';
        if (!aliasColumn.startsWith(prefix)) return aliasColumn;
        return aliasColumn.substring(prefix.length);
    }

    private enumExpression(col: Column): string | null {
        if (!col.enumValues) return null;
        const alias = this.getAlias();
        const colRef = `${alias}.${col.name}`;
        const whenThens = col.enumValues.map(ev => {
            const valLiteral = typeof ev.value === 'number' ? `${ev.value}` : `'${String(ev.value).replace(/'/g, "''")}'`;
            const label = ev.label ? String(ev.label).replace(/'/g, "''") : `Value "${String(ev.value).replace(/"/g, '\\"')}"`;
            return `WHEN ${colRef} = ${valLiteral} THEN '${label}'`;
        }).join(' ');
        return `(CASE ${whenThens} ELSE 'Value "' || ${colRef} || '"' END)`;
    }

    private whereClause(filter?: Filter | Filter[]): string {
        if (!filter) return '';
        const alias = this.getAlias();
        const filters = Array.isArray(filter) ? filter : [filter];
        const conditions = filters.map(f => {
            let colRef: string;
            if ('alias' in f) {
                const colName = this.aliasToColumnName(f.alias);
                colRef = `${alias}.${colName}`;
            } else {
                colRef = `${alias}.${f.column}`;
            }
            const operator = (f.operator || '=') as string;
            if (f.value === null) {
                const op = operator.toUpperCase() === 'IS NOT' ? 'IS NOT' : 'IS';
                return `${colRef} ${op} NULL`;
            }
            let literal: string;
            if (typeof f.value === 'number') literal = String(f.value);
            else if (typeof f.value === 'boolean') literal = f.value ? 'TRUE' : 'FALSE';
            else literal = `'${String(f.value).replace(/'/g, "''")}'`;
            return `${colRef} ${operator} ${literal}`;
        });
        return ' WHERE ' + conditions.join(' AND ');
    }
}
