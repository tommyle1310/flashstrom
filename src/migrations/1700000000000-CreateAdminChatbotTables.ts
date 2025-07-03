import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAdminChatbotTables1700000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create chatbot_responses table
    await queryRunner.createTable(
      new Table({
        name: 'chatbot_responses',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true
          },
          {
            name: 'keyword',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'response_type',
            type: 'enum',
            enum: ['TEXT', 'OPTIONS', 'GUIDE']
          },
          {
            name: 'response_text',
            type: 'text'
          },
          {
            name: 'options',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'parent_id',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['parent_id'],
            referencedTableName: 'chatbot_responses',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    );

    // Create chatbot_guides table
    await queryRunner.createTable(
      new Table({
        name: 'chatbot_guides',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true
          },
          {
            name: 'response_id',
            type: 'integer'
          },
          {
            name: 'step_number',
            type: 'integer'
          },
          {
            name: 'step_text',
            type: 'text'
          },
          {
            name: 'next_step_id',
            type: 'integer',
            isNullable: true
          }
        ],
        foreignKeys: [
          {
            columnNames: ['response_id'],
            referencedTableName: 'chatbot_responses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            columnNames: ['next_step_id'],
            referencedTableName: 'chatbot_guides',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      'chatbot_responses',
      new TableIndex({
        name: 'IDX_chatbot_responses_keyword',
        columnNames: ['keyword']
      })
    );

    await queryRunner.createIndex(
      'chatbot_responses',
      new TableIndex({
        name: 'IDX_chatbot_responses_type',
        columnNames: ['response_type']
      })
    );

    await queryRunner.createIndex(
      'chatbot_guides',
      new TableIndex({
        name: 'IDX_chatbot_guides_response_step',
        columnNames: ['response_id', 'step_number']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex(
      'chatbot_guides',
      'IDX_chatbot_guides_response_step'
    );
    await queryRunner.dropIndex(
      'chatbot_responses',
      'IDX_chatbot_responses_type'
    );
    await queryRunner.dropIndex(
      'chatbot_responses',
      'IDX_chatbot_responses_keyword'
    );

    // Drop tables
    await queryRunner.dropTable('chatbot_guides');
    await queryRunner.dropTable('chatbot_responses');
  }
}
