from datetime import datetime
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import db


class Usuario(db.Model):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(nullable=False)
    email: Mapped[str] = mapped_column(nullable=False, unique=True, index=True)
    senha: Mapped[str] = mapped_column(nullable=False)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    pacientes: Mapped[list["Paciente"]] = relationship(
        "Paciente",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )


class Sexo(db.Model):
    __tablename__ = "sexo"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(nullable=False, unique=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    pacientes: Mapped[list["Paciente"]] = relationship(
        "Paciente",
        back_populates="sexo",
    )


class Paciente(db.Model):
    __tablename__ = "paciente"

    id: Mapped[str] = mapped_column(primary_key=True)  # ex: "P001"
    nome: Mapped[str] = mapped_column(nullable=False)
    idade: Mapped[int | None] = mapped_column(nullable=True)

    sexo_id: Mapped[int | None] = mapped_column(
        ForeignKey("sexo.id"),
        nullable=True,
        index=True,
    )
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuario.id"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    sexo: Mapped["Sexo"] = relationship(
        "Sexo",
        back_populates="pacientes",
    )
    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="pacientes",
    )

    # Mudança: passive_deletes=True para combinar com ON DELETE CASCADE no FK de Exame
    exames: Mapped[list["Exame"]] = relationship(
        "Exame",
        back_populates="paciente",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Exame(db.Model):
    __tablename__ = "exame"

    id: Mapped[str] = mapped_column(primary_key=True)  # ex: "E001"

    paciente_id: Mapped[str] = mapped_column(
        ForeignKey("paciente.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # arquivo
    imagem_path: Mapped[str | None] = mapped_column(nullable=True)          # caminho absoluto/relativo (MVP)
    original_filename: Mapped[str | None] = mapped_column(nullable=True)    # opcional, mas útil

    # pipeline
    status: Mapped[str] = mapped_column(nullable=False, server_default="PENDING")
    resultado: Mapped[str | None] = mapped_column(nullable=True)
    confianca: Mapped[float | None] = mapped_column(nullable=True)

    model_name: Mapped[str | None] = mapped_column(nullable=True)
    model_version: Mapped[str | None] = mapped_column(nullable=True)

    processed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    error_message: Mapped[str | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    paciente: Mapped["Paciente"] = relationship(
        "Paciente",
        back_populates="exames",
    )