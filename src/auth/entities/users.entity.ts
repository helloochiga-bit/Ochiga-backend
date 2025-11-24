import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("users")
export class Users {
  @PrimaryGeneratedColumn("uuid")
  id!: string; // Use "!" to tell TS that TypeORM will assign the value

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true, nullable: true })
  username!: string | null;

  @Column()
  password!: string;

  @Column({ default: false })
  isResident!: boolean;

  @Column({ default: false })
  isEstateOwner!: boolean;

  @Column({ nullable: true })
  homeId!: string | null;

  @Column({ nullable: true })
  estateId!: string | null;
}
