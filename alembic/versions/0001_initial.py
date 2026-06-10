"""Initial DB schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-06-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String, nullable=False),
        sa.Column('email', sa.String),
        sa.Column('hashed_password', sa.String),
        sa.Column('is_verified', sa.Boolean, server_default=sa.text('0')),
        sa.Column('verification_code', sa.String),
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'user_stats',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('level', sa.Integer, server_default='1'),
        sa.Column('points', sa.Integer, server_default='0'),
        sa.Column('gems', sa.Integer, server_default='0'),
        sa.Column('streak_days', sa.Integer, server_default='0'),
        sa.Column('completed_tasks', sa.Integer, server_default='0'),
    )

    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('title', sa.String),
        sa.Column('description', sa.String),
        sa.Column('difficulty', sa.String),
        sa.Column('points', sa.Integer),
        sa.Column('task_type', sa.String),
        sa.Column('completed', sa.Boolean, server_default=sa.text('0')),
    )


def downgrade():
    op.drop_table('tasks')
    op.drop_table('user_stats')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')
