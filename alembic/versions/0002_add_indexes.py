"""Add indexes for foreign keys and leaderboard ordering

Revision ID: 0002_add_indexes
Revises: 0001_initial
Create Date: 2026-06-06 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_add_indexes'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Indexes to speed up joins and leaderboard queries
    op.create_index('ix_user_stats_user_id', 'user_stats', ['user_id'])
    op.create_index('ix_tasks_user_id', 'tasks', ['user_id'])
    op.create_index('ix_user_stats_points', 'user_stats', ['points'])


def downgrade():
    op.drop_index('ix_user_stats_points', table_name='user_stats')
    op.drop_index('ix_tasks_user_id', table_name='tasks')
    op.drop_index('ix_user_stats_user_id', table_name='user_stats')
