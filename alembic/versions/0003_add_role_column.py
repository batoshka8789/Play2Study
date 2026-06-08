"""Add role column to users

Revision ID: 0003_add_role_column
Revises: 0002_add_indexes
Create Date: 2026-06-07 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003_add_role_column'
down_revision = '0002_add_indexes'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='user'))


def downgrade():
    op.drop_column('users', 'role')
