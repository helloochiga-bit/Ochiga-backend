import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from "typeorm";

@Entity("users")
export class Users {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: false })
  isResident: boolean;

  @Column({ default: false })
  isEstateOwner: boolean;

  @Column({ nullable: true })
  homeId: string;

  @Column({ nullable: true })
  estateId: string;
}
